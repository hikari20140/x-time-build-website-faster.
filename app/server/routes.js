export const routes = [
  {
    method: "GET",
    path: "/api/hello",
    handler: (ctx) => {
      ctx.sendJson(200, {
        message: "hello from xtime",
        time: new Date().toISOString()
      });
    }
  }
];
