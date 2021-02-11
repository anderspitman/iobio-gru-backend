const url = require('url');


function methodNotAllowed(ctx) {
  ctx.status = 405;
  ctx.body = "Method not allowed";
}

class Router {
  constructor() {
    this.routes = [];
  }

  get(p, handler) {
    const func = async (ctx) => {
      if (ctx.method !== 'GET') {
        methodNotAllowed(ctx);
        return;
      }

      await handler(ctx);
    };

    const route = {
      path: p,
      func,
    };

    this.routes.push(route);
  }

  post(p, handler) {
    const func = async (ctx) => {
      if (ctx.method !== 'POST') {
        methodNotAllowed(ctx);
        return;
      }

      await handler(ctx);
    };

    const route = {
      path: p,
      func,
    };

    this.routes.push(route);
  }

  use(p, router) {
    const func = async (ctx) => {
      await router.handle(ctx);
    };

    const route = {
      path: p,
      func,
    };

    this.routes.push(route);
  }

  async makeCtx(req, res, prefix) {
    const maxSize = 10*1024*1024;

    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        if (data.length + chunk.length > maxSize) {
          // TODO: trigger error here
        }

        data += chunk;
      });
      req.on('end', () => {
        resolve(data);
      });
      req.on('error', () => {
        reject();
      });
    });

    function set(header, value) {
      res.setHeader(header, value);
    }

    const u = url.parse(req.url); 
    const ctx = {
      method: req.method,
      path: u.pathname.slice(prefix.length),
      headers: req.headers,
      request: {
        body,
      },
      set,
      _req: req,
      _res: res,
    };

    return ctx;
  }

  async closeCtx(ctx) {
    if (ctx.status) {
      ctx._res.statusCode = ctx.status;
    }

    if (ctx.body) {
      if (typeof ctx.body === 'string') {
        ctx._res.write(ctx.body);
        ctx._res.end();
      }
      else {
        ctx.body.pipe(ctx._res);
      }
    }
    else {
      ctx._res.end();
    }
  }

  async handleRaw(req, res, prefix) {
    const ctx = await this.makeCtx(req, res, prefix);
    await this.handle(ctx);
    this.closeCtx(ctx);
  }

  async handle(ctx, prefix) {

    let longest = { path: '' };

    for (const route of this.routes) {
      if (ctx.path.startsWith(route.path)) {
        console.log("match", route);
        if (route.path.length > longest.path.length) {
          longest = route;
        }
      }
    }

    if (longest.func) {
      console.log("calling", longest);
      try {
        await longest.func(ctx);
      }
      catch (e) {
        console.error(e);
        return;
      }
    }
  }

}

module.exports = {
  Router,
};
