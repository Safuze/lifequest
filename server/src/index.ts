import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes (добавим по мере разработки)
// app.use('/api/v1/auth', authRouter);
// app.use('/api/v1/goals', goalsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;