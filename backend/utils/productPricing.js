class ProductSelectionError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ProductSelectionError';
    this.status = status;
  }
}

function requirePrice(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Product has an invalid ${field}.`);
  }
  return value;
}

function resolveProductCartItem(product, cartItem) {
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  let sizeVariant = null;
  let sizeLabel = null;

  if (sizes.length) {
    const requestedSize = cartItem.selectedSize;
    const sizeIndex = requestedSize
      ? sizes.findIndex(size => (typeof size === 'string' ? size : size?.label) === requestedSize)
      : 0;
    if (sizeIndex < 0) {
      throw new ProductSelectionError('A selected product size is no longer available. Please update your cart.');
    }
    const size = sizes[sizeIndex];
    sizeVariant = typeof size === 'string' ? { label: size } : size;
    sizeLabel = sizeVariant?.label || null;
  } else if (cartItem.selectedSize) {
    throw new ProductSelectionError('A selected product size is no longer available. Please update your cart.');
  }

  const colors = Array.isArray(sizeVariant?.colors) && sizeVariant.colors.length
    ? sizeVariant.colors
    : (Array.isArray(product.colors) ? product.colors : []);
  let color = null;
  if (colors.length) {
    const requestedColor = cartItem.selectedColor;
    const colorIndex = requestedColor
      ? colors.findIndex(option => option?.name === requestedColor)
      : 0;
    if (colorIndex < 0) {
      throw new ProductSelectionError('A selected product color is no longer available. Please update your cart.');
    }
    color = colors[colorIndex];
    if (color.in_stock === false) {
      throw new ProductSelectionError('A selected product color is out of stock.', 409);
    }
  } else if (cartItem.selectedColor) {
    throw new ProductSelectionError('A selected product color is no longer available. Please update your cart.');
  }

  if (sizeVariant?.in_stock === false) {
    throw new ProductSelectionError('A selected product size is out of stock.', 409);
  }

  const basePrice = requirePrice(sizeVariant?.price_cents ?? product.price_cents, 'base price');
  const colorPrice = color?.price_cents;
  const priceBeforeModifiers = colorPrice ? requirePrice(colorPrice, 'color price') : basePrice;
  const groups = Array.isArray(product.variant_groups) ? product.variant_groups : [];
  const selectedIndices = Array.isArray(cartItem.selectedVariants) ? cartItem.selectedVariants : [];
  if (selectedIndices.length > groups.length) {
    throw new ProductSelectionError('Product options have changed. Please update your cart.');
  }

  let variantPriceModifier = 0;
  const variants = groups.map((group, groupIndex) => {
    const options = Array.isArray(group?.options) ? group.options : [];
    if (!options.length) {
      throw new ProductSelectionError('Product options have changed. Please update your cart.');
    }
    const selectedIndex = selectedIndices[groupIndex] ?? 0;
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) {
      throw new ProductSelectionError('A selected product option is no longer available. Please update your cart.');
    }
    const option = options[selectedIndex];
    const modifier = option.price_modifier_cents ?? 0;
    if (!Number.isSafeInteger(modifier)) {
      throw new Error('Product has an invalid option price.');
    }
    variantPriceModifier += modifier;
    return { group: group.name, option: option.label };
  });

  const priceCents = priceBeforeModifiers + variantPriceModifier;
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new Error('Product options result in an invalid price.');
  }

  return {
    product_id: product.id,
    name: product.name,
    price_cents: priceCents,
    selected_options: {
      ...(sizeLabel ? { size: sizeLabel } : {}),
      ...(color?.name ? { color: color.name } : {}),
      ...(variants.length ? { variants } : {}),
    },
  };
}

module.exports = { ProductSelectionError, resolveProductCartItem };
