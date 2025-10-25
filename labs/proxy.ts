(async () => {
  const response = await fetch(
    "http://i2yy7nPZLH.localhost:3000/api/search?query=hello",
  );
  const data = await response.json();

  console.log(data);
})();
