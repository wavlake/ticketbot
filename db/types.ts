export interface Event {
  id: number;
  name: string;
  description: string;
  location: string;
  price_msat: number;
  total_tickets: number;
  max_tickets_per_person: number;
  date_start_str: string;
  date_end_str: string;
  time_start_str: string;
  time_end_str: string;
  created_at: Date;
  updated_at: Date;
}
