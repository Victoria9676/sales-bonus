/**
 * Функция для расчёта выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { discount, sale_price, quantity } = purchase;
  return sale_price * (1 - discount / 100) * quantity;
}
/**
 * Функция для расчёта бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  if (index === 0) {
    return profit * 0.15;
  } else if (index <= 2) {
    return profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    return profit * 0.05;
  }
}

function isFunction(f) {
  return typeof f === "function";
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  // Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    !Array.isArray(data.customers) ||
    data.products.length === 0 ||
    data.customers.length === 0 ||
    data.sellers.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }
  const { products, sellers, purchase_records } = data;
  const {calculateRevenue, calculateBonus} = options;
  if (
    !calculateRevenue ||
    !calculateBonus ||
    !isFunction(calculateRevenue) ||
    !isFunction(calculateBonus)
  ) {
    throw new Error("Необходимые функции расчёта не предоставлены");
  }

  // Подготовка промежуточных данных для сбора статистики
  const sellerStats = sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = sellerStats.reduce(
    (result, seller) => ({
      ...result,
      [seller.id]: seller,
    }),
    {},
  );
  const productIndex = products.reduce(
    (result, product) => ({
      ...result,
      [product.sku]: product,
    }),
    {},
  );

  // Расчёт выручки и прибыли для каждого продавца
  purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return; // Защита от отсутствующих продавцов
    seller.sales_count++;
    //seller.revenue += record.total_amount;
    seller.revenue += record.total_amount || 0; // Учёт возможного отсутствия поля

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return; // Защита от отсутствующих товаров
      //const cost = product.purchase_price * item.quantity;
      const cost = (product.purchase_price || 0) * (item.quantity || 1);
      const revenue = calculateRevenue(item, product);
      seller.profit += revenue - cost;
      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      //seller.products_sold[item.sku] += item.quantity;
      seller.products_sold[item.sku] += item.quantity || 1;
    });
  });

  // Сортировка продавцов по прибыли
  sellerStats.sort((a, b) => b.profit - a.profit);
  // Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);
    seller.top_products = Object.entries(seller.products_sold)
      .map((v) => ({
        sku: v[0],
        quantity: v[1],
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }))
}
