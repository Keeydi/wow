import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import './db'; // Initialize database connection
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import departmentRoutes from './routes/departments';
import designationRoutes from './routes/designations';
import calendarEventRoutes from './routes/calendarEvents';
import activityLogRoutes from './routes/activityLogs';
import documentRoutes from './routes/documents';
import notificationRoutes from './routes/notifications';
import attendanceRoutes from './routes/attendance';

const app = express();
const PORT = process.env.PORT || 4000;
// Allow multiple origins for development
const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://127.0.0.1:5173'];

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development for easier debugging
    }
  },
  credentials: true 
}));
app.use(helmet());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRoutes);
app.use('/employees', employeeRoutes);
app.use('/departments', departmentRoutes);
app.use('/designations', designationRoutes);
app.use('/calendar-events', calendarEventRoutes);
app.use('/activity-logs', activityLogRoutes);
app.use('/documents', documentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/attendance', attendanceRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HR Hub API listening on port ${PORT}`);
});

