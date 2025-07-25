export interface Dataset {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: Date;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  chartData?: any;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}