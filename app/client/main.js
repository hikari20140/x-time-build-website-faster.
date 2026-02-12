const button = document.getElementById("ping");
const result = document.getElementById("result");

button?.addEventListener("click", async () => {
  const res = await fetch("/api/hello");
  const json = await res.json();
  if (result) {
    result.textContent = JSON.stringify(json, null, 2);
  }
});
