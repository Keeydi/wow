import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
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
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ORIGIN, credentials: true }));
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`HR Hub API listening on port ${PORT}`);
});

