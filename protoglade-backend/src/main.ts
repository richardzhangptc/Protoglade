import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3000',
    'https://protoglade.com',
    'https://www.protoglade.com',
    'https://protoglade-frontend.vercel.app',
    'https://protoglade-frontend-ioabs76h8-richard-zhangs-projects-1f060c92.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Server running on port ${port}`);
}
bootstrap();
