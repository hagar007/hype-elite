import test from "node:test";
import assert from "node:assert/strict";
import { sneakerPrice, sneakerSizes, importedPages, sneakerRecords, buildSneakerCatalog } from "../scripts/sync-sneakers.mjs";

const record = { id: "shoe-1", label: "Adidas Adizero", photo: "https://meucatalogotenis.netlify.app/fotos/c-premium-importado/adidas-adizero/001.jpg", thumbnail: "https://meucatalogotenis.netlify.app/thumbs/c-premium-importado/adidas-adizero/001.jpg", sizes: ["38", "39"], sizeRange: "38 ao 39", sourcePath: "/prod-importado-adidas-adizero" };
test("todo tênis recebe R$150 e final de 99 centavos no mesmo real", () => {
  for (const [cost, expected] of [[160,310.99],[170,320.99],[200,350.99],[210,360.99],[220,370.99],[240,390.99],[250,400.99],[270,420.99],["199.99",349.99]]) assert.equal(sneakerPrice(cost),expected);
  for (const value of [null,"",0,-10,"Consulte","100,00","10.123"]) assert.equal(sneakerPrice(value),null);
});
test("somente os links da aba Importado são importados, sem categorias do menu", () => {
  const html='<nav><a href="/prod-nacional-nike">Nike</a><a href="/prod-meias">Meias</a></nav><span class="count">1 marcas itens</span><main><a class="tile" href="/prod-importado-adidas-adizero">Adizero</a></main>';
  assert.deepEqual(importedPages(html),["/prod-importado-adidas-adizero"]);
  assert.throws(()=>importedPages(html.replace('1 marcas','2 marcas')),/incompleta/);
});
test("a numeração corresponde ao intervalo publicado, sem inferir estoque unitário", () => {
  assert.deepEqual(sneakerSizes("34 ao 39"),["34","35","36","37","38","39"]);
  assert.equal(sneakerSizes("34 ao 43").length,10);
  assert.throws(()=>sneakerSizes("43 ao 34"),/inválida/);
  assert.throws(()=>sneakerSizes("consulte"),/não reconhecida/);
});
test("cada modelo mantém sua foto, preço, identificação e frete grátis", () => {
  const {products}=buildSneakerCatalog([record],[{drive_id:"shoe-1",price:240}]);
  assert.equal(products[0].price,390.99);
  assert.equal(products[0].freeShipping,true);
  assert.equal(products[0].availabilityConfirmation,true);
  assert.deepEqual(products[0].photos,[record.photo]);
  assert.equal(products[0].photoPreview,record.thumbnail);
  assert.deepEqual(products[0].availableSizes,["38","39"]);
});
test("preço ausente bloqueia o modelo sem reaproveitar um preço antigo", () => {
  const {products,metadata}=buildSneakerCatalog([record],[{drive_id:"other",price:240}]);
  assert.equal(products[0].price,null);
  assert.equal(products[0].available,false);
  assert.equal(metadata.unpricedCount,1);
  assert.ok(products[0].variants.every(v=>!v.available));
});
test("fontes incompletas e imagens de outras coleções interrompem a atualização", () => {
  assert.throws(()=>buildSneakerCatalog([],[]),/vazia/);
  assert.throws(()=>buildSneakerCatalog([record,record],[{drive_id:"shoe-1",price:240}]),/duplicados/);
  const html=`<span class="count">1 modelos</span><figure class="ph" data-id="shoe-1" data-label="Adidas" data-full="${record.photo}" data-num="38 ao 39"><img src="${record.thumbnail}"></figure>`;
  assert.equal(sneakerRecords(html,record.sourcePath).length,1);
  assert.throws(()=>sneakerRecords(html,'/prod-nacional-nike'),/Somente/);
  assert.throws(()=>sneakerRecords(html.replaceAll('c-premium-importado','nacional'),record.sourcePath),/fora/);
  assert.throws(()=>sneakerRecords(html.replace('1 modelos','2 modelos'),record.sourcePath),/incompletos/);
});
