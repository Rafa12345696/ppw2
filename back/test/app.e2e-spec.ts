import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Base de datos falsa: la app arranca completa (GraphQL, MCP, guards) sin conectarse a MongoDB.
// Cada modelo responde vacio salvo lo que cada prueba necesita.
function prismaFalso() {
  const modelo = () => ({
    findMany: async () => [],
    findUnique: async () => null,
    findFirst: async () => null,
    count: async () => 0,
    updateMany: async () => ({ count: 0 }),
  });
  const db: Record<string, any> = {
    $connect: async () => {},
    $disconnect: async () => {},
    usuario: modelo(),
    producto: modelo(),
    categoria: modelo(),
    pedido: modelo(),
    pago: modelo(),
    webhookEvento: modelo(),
    passwordResetToken: modelo(),
  };
  db.$transaction = async (fn: (tx: unknown) => unknown) => fn(db);
  return db;
}

// Llama al servidor MCP como lo haria un agente (JSON-RPC sobre HTTP)
function mcp(app: INestApplication, metodo: string, params: unknown, id = 1) {
  return request(app.getHttpServer())
    .post('/mcp')
    .set('Accept', 'application/json, text/event-stream')
    .send({ jsonrpc: '2.0', id, method: metodo, params });
}

describe('Elixir (e2e)', () => {
  let app: INestApplication;
  const db = prismaFalso();

  beforeAll(async () => {
    db.categoria.findMany = async () => [{ id: '65f0c0ffee00000000000aaa', nombre: 'Tequila' }];
    db.pedido.findMany = async (args: any) =>
      args?.where?.estado === 'PAGADO' ? [{ detalles: [{ productoId: '65f0c0ffee00000000000001', cantidad: 3 }] }] : [];
    db.producto.findMany = async (args: any) =>
      args?.where?.id
        ? [{ id: '65f0c0ffee00000000000001', nombre: 'Don Julio 70', precio: 850, precioAntes: null, premium: true, stock: 10, descripcion: 'd', imagen: '/x.png', categoriaId: '65f0c0ffee00000000000aaa' }]
        : [];

    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde ok', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ ok: true });
  });

  it('GraphQL: masVendidos es publico y trae premium', async () => {
    const r = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ masVendidos(limite: 3) { nombre premium } }' })
      .expect(200);
    expect(r.body.data.masVendidos).toEqual([{ nombre: 'Don Julio 70', premium: true }]);
  });

  it('GraphQL: la bitacora exige sesion de admin', async () => {
    const r = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ bitacoraPagina { total } }' })
      .expect(200);
    expect(r.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('MCP: se inicializa y lista sus herramientas de solo lectura', async () => {
    const init = await mcp(app, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'prueba', version: '1.0.0' },
    }).expect(200);
    expect(init.body.result.serverInfo.name).toBe('elixir');

    const lista = await mcp(app, 'tools/list', {}, 2).expect(200);
    const nombres = lista.body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(nombres).toEqual(['buscar_productos', 'estado_pedido', 'listar_categorias', 'mas_vendidos']);
  });

  it('MCP: listar_categorias responde con datos del catalogo', async () => {
    const r = await mcp(app, 'tools/call', { name: 'listar_categorias', arguments: {} }, 3).expect(200);
    expect(JSON.parse(r.body.result.content[0].text)).toEqual([{ id: '65f0c0ffee00000000000aaa', nombre: 'Tequila' }]);
  });

  it('MCP: estado_pedido sin token se rechaza', async () => {
    const r = await mcp(app, 'tools/call', { name: 'estado_pedido', arguments: { pedidoId: '65f0c0ffee00000000000001' } }, 4).expect(200);
    expect(r.body.result.isError).toBe(true);
  });
});
