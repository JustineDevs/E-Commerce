type SSEClient = {
  controller: ReadableStreamDefaultController;
  userId: string;
};

const clients: SSEClient[] = [];

export function broadcastEvent(eventType: string, payload: unknown) {
  const msg = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  const dead: number[] = [];
  for (let i = 0; i < clients.length; i++) {
    try {
      clients[i].controller.enqueue(new TextEncoder().encode(msg));
    } catch {
      dead.push(i);
    }
  }
  for (let i = dead.length - 1; i >= 0; i--) {
    clients.splice(dead[i], 1);
  }
}

export function registerSseClient(controller: ReadableStreamDefaultController, userId: string) {
  const client: SSEClient = { controller, userId };
  clients.push(client);
  return client;
}

export function unregisterSseClient(client: SSEClient) {
  const idx = clients.indexOf(client);
  if (idx >= 0) clients.splice(idx, 1);
}
