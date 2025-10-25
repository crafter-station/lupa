(async () => {
  const response = await fetch("http://localhost:3000/api/cat?path=/github", {
    headers: {
      Host: "i2yy7nPZLH.localhost:3000",
      Authorization:
        "Bearer lupa_sk_i2yy7nPZLH_9bGCN5qMqGYswtsWDTDkNLnrDxWZvnwa",
      "Deployment-Id": "xePwreP93y",
    },
  });

  const data = await response.text();

  console.log(data);
})();
