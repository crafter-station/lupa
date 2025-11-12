export async function register() {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_RUNTIME === "nodejs"
  ) {
    const dns = await import("node:dns");
    const { setGlobalDispatcher, Agent } = await import("undici");

    setGlobalDispatcher(
      new Agent({
        connect: {
          lookup: (hostname, options, callback) => {
            if (hostname.endsWith(".localhost")) {
              return callback(null, [{ address: "127.0.0.1", family: 4 }]);
            }
            return dns.lookup(hostname, options, callback);
          },
        },
      }),
    );
  }
}
