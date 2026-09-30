
  'POST /shorten': async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { url } = JSON.parse(body);
    const link = save(url);
    res.writeHead(201, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ short: `/${link.code}` }));
  },
