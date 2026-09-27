export interface TourGroup {
  code: string;
  name: string;
  date: string;
  days: string;
  totalSeats: number;
  availableSeats: number;
  price: string;
  buttonText: string;
  buttonType: string;
  isGuaranteed: boolean;
  orderUrl: string;
  detailUrl: string;
  updatedAt?: string;
}

export type NotificationChannel = 'telegram' | 'line_messaging' | 'webhook';

export interface MonitoredSlot {
  id: string; // e.g. 'slot_1', 'slot_2'
  label: string; // e.g. '監控行程1', '監控行程2'
  targetDate: string; // e.g. '2026/10/31 (六)'
  targetCode: string; // e.g. 'ILN34261031A'
  minAvailableSeats: number; // threshold value, e.g. 10
  comparisonOperator?: '>=' | '>' | '<=' | '<'; // default '>=' or '<='
  enabled: boolean;
}

export interface MonitoringConfig {
  targetKeyword: string;
  pollIntervalSeconds: number; // e.g., 30
  isMonitoringActive: boolean;
  soundEnabled: boolean;
  browserNotifyEnabled: boolean;

  // Multi-slot monitoring (Supports 2 target groups simultaneously)
  slots: MonitoredSlot[];

  // Telegram credentials live only in GitHub Actions Secrets.
  channel: NotificationChannel;
  telegramBotToken?: string;
  telegramChatId?: string;

  // Secondary alternatives
  lineChannelAccessToken: string;
  lineUserId: string;
  customWebhookUrl: string;

  // 24-Hour Autonomous Server & Quiet Hours
  quietHoursEnabled: boolean; // default true
  quietStartHour: number; // default 23 (23:00)
  quietEndHour: number; // default 8 (08:00)
}

export interface SlotStatusResult {
  slotId: string;
  targetGroup: TourGroup | null;
  targetDate: string;
  targetCode: string;
  minAvailableSeats: number;
  comparisonOperator?: '>=' | '>' | '<=' | '<';
  availableSeats: number;
  isConditionMet: boolean;
  orderUrl: string;
}

export interface CheckLog {
  id: string;
  timestamp: string;
  status: 'ok' | 'alert' | 'error' | 'test';
  date: string;
  targetCode?: string;
  slotLabel?: string;
  availableSeats: number;
  message: string;
  notified: boolean;
  notificationResult?: string;
}

export interface CheckResponse {
  success: boolean;
  timestamp: string;
  slotResults: SlotStatusResult[];
  allGroups: TourGroup[];
  sourceUrl: string;
  error?: string;
  notificationsConfigured?: boolean;
  previousTimestamp?: string | null;
}
