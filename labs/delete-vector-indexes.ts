(async () => {
  const url = "https://api.upstash.com/v2/vector/index";
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create vector index: ${response.status} ${errorText}`,
    );
  }

  const list = await response.json();

  console.log(list.map((x) => x.id));

  for (const index of list) {
    const deleteUrl = `${url}/${index.id}`;
    const deleteResponse = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
      },
    });
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(
        `Failed to delete vector index: ${deleteResponse.status} ${errorText}`,
      );
    } else {
      console.log(`Deleted vector index: ${index.id}`);
    }
  }

  // const url = "https://api.upstash.com/v2/vector/index";
  // const response = await fetch(url, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     name: deploymentId,
  //     region: "us-east-1",
  //     similarity_function: "COSINE",
  //     dimension_count: 1024,
  //     type: "payg",
  //     embedding_model: "BGE_M3",
  //     index_type: "HYBRID",
  //     sparse_embedding_model: "BM25",
  //   }),
  // });
  // if (!response.ok) {
  //   const errorText = await response.text();
  //   throw new Error(
  //     `Failed to create vector index: ${response.status} ${errorText}`,
  //   );
  // }
})();
