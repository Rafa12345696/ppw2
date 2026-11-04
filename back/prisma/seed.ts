import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// OJO: este seed BORRA todo y deja datos de demo. No lo corras contra la base de produccion.
async function main() {
  // Se borra de "hijos" a "padres" para no dejar referencias rotas
  await prisma.webhookEvento.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.usuario.deleteMany();

  const passwordHasheado = await bcrypt.hash('123456', 10);

  const clienteDemo = await prisma.usuario.create({
    data: {
      nombre: 'Cliente Demo',
      email: 'cliente@elixir.com',
      password: passwordHasheado,
      rol: 'CLIENTE',
    },
  });

  const adminDemo = await prisma.usuario.create({
    data: {
      nombre: 'Admin Demo',
      email: 'admin@elixir.com',
      password: passwordHasheado,
      rol: 'ADMIN',
    },
  });

  const tequila = await prisma.categoria.create({ data: { nombre: 'Tequila' } });
  const whisky = await prisma.categoria.create({ data: { nombre: 'Whisky' } });

  // Las rutas deben coincidir EXACTO con front/public/imagenes (Netlify distingue mayusculas)
  await prisma.producto.createMany({
    data: [
      { nombre: 'Don Julio 70', precio: 850, stock: 10, descripcion: 'Tequila anejo cristalino', imagen: '/imagenes/DonJulio70.png', premium: true, categoriaId: tequila.id },
      { nombre: 'Jose Cuervo Especial', precio: 320, stock: 20, descripcion: 'Tequila reposado', imagen: '/imagenes/Cuervo.png', precioAntes: 380, categoriaId: tequila.id },
      // Sin imagen local: subela desde el panel de admin (Cloudinary)
      { nombre: 'Johnnie Walker Black', precio: 780, stock: 15, descripcion: 'Whisky escoces 12 anos', imagen: '', categoriaId: whisky.id },
    ],
  });

  console.log('Usuario cliente demo:', clienteDemo.email, '/ password: 123456');
  console.log('Usuario admin demo:', adminDemo.email, '/ password: 123456');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });