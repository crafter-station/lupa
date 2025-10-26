(async () => {
  const response = await fetch(
    "http://i2yy7nPZLH.localhost:3000/api/search?query=github",
    {
      headers: {
        Authorization:
          "Bearer lupa_sk_i2yy7npzlh_6f0umliZ0PhfZROyhhF6iHngRMOu1knY",
        "Deployment-Id": "xePwreP93y",
      },
    },
  );

  const data = await response.json();

  console.log(data);
})();
