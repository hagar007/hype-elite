import test from "node:test";
import assert from "node:assert/strict";
import { buildCatalog, retailPrice, normalizeSize } from "../scripts/sync-catalog.mjs";

const photo = "https://cdn.shopify.com/s/files/test/model.jpg";
function fixture() {
  return {
    models: [{ id: "model-1", name: "Camisa Flamengo I 2026/27", team_id: "team-1", photos: [photo], sizes: ["P", "M"], shopify_product_id: "gid://shopify/Product/10", created_date: "2026-09-01" }],
    teams: [{ id: "team-1", name: "Flamengo", country_id: "country-1" }],
    countries: [{ id: "country-1", name: "Times Brasileiros" }],
    supplierProducts: [{ id: 10, title: "Camisa Flamengo I 2026/27", options: [{ name: "Tamanho" }], variants: [{ option1: "P", price: "60.00", available: true }, { option1: "M", price: "80.00", available: true }, { option1: "G", price: "100.00", available: true }] }],
  };
}

test("acréscimo fixo de 75 reais, sem porcentagem nem arredondamento comercial", () => {
  for (const [cost, price] of [["40", 115], ["60", 135], ["80", 155], ["100", 175], ["200", 275], ["72.81", 147.81], ["109.27", 184.27]]) {
    assert.equal(retailPrice(cost), price);
  }
  for (const value of [null, "", "0.00", "-10", "abc", "72,81"]) assert.equal(retailPrice(value), null);
});

test("cada variação conserva seu preço e só vende tamanhos disponíveis nas duas fontes", () => {
  const data = fixture();
  data.supplierProducts[0].variants[1].available = false;
  const product = buildCatalog(data).products[0];
  assert.deepEqual(product.availableSizes, ["P"]);
  assert.equal(product.price, 135);
  assert.deepEqual(product.variants.map(v => [v.size, v.price, v.available]), [["P", 135, true], ["M", 155, false], ["G", 175, false]]);
});

test("kit infantil recebe o mesmo acréscimo fixo e normaliza o tamanho com idade", () => {
  const data = fixture();
  Object.assign(data.models[0], { name: "Kit Infantil Flamengo", is_kids_kit: true, sizes: ["T18"] });
  data.supplierProducts[0].variants = [{ option1: "Tam 18 - 4-5 anos", price: "70.00", available: true }];
  const product = buildCatalog(data).products[0];
  assert.equal(product.price, 145);
  assert.equal(product.type, "kit-infantil");
  assert.equal(product.gender, "infantil");
  assert.equal(product.variants[0].label, "Tam 18 - 4-5 anos");
  assert.deepEqual(product.availableSizes, ["T18"]);
  assert.equal(normalizeSize("Tam 24 - 8-9 anos"), "T24");
});

test("kit adulto soma 75 reais ao kit, uma única vez", () => {
  const data = fixture();
  data.models[0].name = "Kit Regata e Short Flamengo";
  const product = buildCatalog(data).products[0];
  assert.equal(product.type, "kit-adulto");
  assert.equal(product.price, 135);
  assert.equal(product.priceVaries, true);
  assert.equal(product.freeShipping, true);
});

test("produto removido da MIC fica sem preço e não pode ser comprado", () => {
  const data = fixture();
  data.models[0].shopify_product_id = "";
  data.models[0].name = "Camisa diferente";
  const { products, metadata } = buildCatalog(data);
  assert.equal(products[0].price, null);
  assert.equal(products[0].available, false);
  assert.deepEqual(products[0].availableSizes, []);
  assert.equal(metadata.unpricedCount, 1);
  assert.equal(products[0].photos[0], photo);
});

test("correspondência de nome ignora acentos e ano abreviado, mas não troca modelo parecido", () => {
  const data = fixture();
  data.models[0].shopify_product_id = "";
  data.models[0].name = "Camisa Flámengo I 26/27";
  assert.equal(buildCatalog(data).products[0].price, 135);
  data.models[0].name = "Camisa Feminina Flamengo I 26/27";
  const product = buildCatalog(data).products[0];
  assert.equal(product.gender, "feminino");
  assert.equal(product.price, null);
});

test("alias revisado exige ID e título da MIC, sem substituição silenciosa", () => {
  const data = fixture();
  data.models[0].shopify_product_id = "";
  data.models[0].name = "Camisa Flamengo Tricolor";
  data.mappings = { "model-1": { productId: "10", title: "Camisa Flamengo I 26/27" } };
  assert.equal(buildCatalog(data).products[0].price, 135);
  data.mappings["model-1"].title = "Camisa Flamengo III 26/27";
  assert.equal(buildCatalog(data).products[0].price, null);
});

test("modelos arquivados saem do catálogo e galerias mantêm todas as fotos válidas", () => {
  const data = fixture();
  data.models.push({ ...data.models[0], id: "archived", is_archived: true });
  data.models[0].photos.push(photo, "javascript:alert(1)", "https://cdn.shopify.com/s/files/test/back.jpg");
  const { products } = buildCatalog(data);
  assert.equal(products.length, 1);
  assert.equal(products[0].photos.length, 2);
});

test("erro de fonte não produz um catálogo vazio publicável", () => {
  const data = fixture();
  assert.throws(() => buildCatalog({ ...data, supplierProducts: [] }), /Fonte vazia/);
  data.models[0].is_archived = true;
  assert.throws(() => buildCatalog(data), /Nenhum modelo ativo/);
});

test("classificações de coleção, retrô e público podem ser combinadas", () => {
  const data = fixture();
  data.models[0].name = "Camisa Feminina Retrô Brasil 1998";
  data.countries[0].name = "Seleções";
  const product = buildCatalog(data).products[0];
  assert.equal(product.gender, "feminino");
  assert.equal(product.collection, "selecoes");
  assert.equal(product.retro, true);
});
