(async () => {
  const response = await fetch("http://i2yy7nPZLH.localhost:3000/api/mcp", {
    method: "POST",
    headers: {
      "Deployment-Id": "xePwreP93y",
      Authorization:
        "Bearer lupa_sk_i2yy7nPZLH_9bGCN5qMqGYswtsWDTDkNLnrDxWZvnwa",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(error);
  } else {
    const data = await response.text();
    console.log(data);
  }
})();
