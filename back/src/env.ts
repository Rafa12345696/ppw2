try {
  process.loadEnvFile();
} catch {
  // si no hay .env, se usan las variables del sistema
}