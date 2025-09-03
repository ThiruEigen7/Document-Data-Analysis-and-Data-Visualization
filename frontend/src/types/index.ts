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
  chartData?: ChartData;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: ChartDataPoint[];
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
}

export interface Persona {
  persona: string;
  rationale: string;
}

export interface Goal {
  question: string;
  visualization: string;
  rationale: string;
  chartJson: Record<string, unknown>;
}