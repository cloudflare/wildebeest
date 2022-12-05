import { Hono } from 'hono'

export interface Env {}

const app = new Hono();
app.get('/', (c: any) => c.text('hi'))

export default app;
