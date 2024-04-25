export interface Event {
  id: number;
  name: string;
  description: string;
  location: string;
  price_msat: number;
  total_tickets: number;
  max_tickets_per_person: number;
  dt_start: Date;
  dt_end: Date;
}
