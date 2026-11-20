class ChildClothingError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

function resolveChildClothingKit(kit, people, customizations = {}) {
  if (!Array.isArray(people) || people.length > 20 || people.some(person =>
    !person || typeof person.label !== 'string' || typeof person.gender !== 'string')) {
    throw new ChildClothingError('Complete sizing for every person in this kit.');
  }
  const children = people.filter(person => person.label.startsWith('Child'));
  if (kit.child_clothing_count > 0 && (children.length !== kit.child_clothing_count ||
      children.some(child => !['male', 'female'].includes(child.gender.toLowerCase())))) {
    throw new ChildClothingError(`Choose boys or girls clothing for exactly ${kit.child_clothing_count} children.`);
  }
  let childIndex = 0;
  const adultIndices = { male: 0, female: 0 };
  const output = [];
  const removed = Array.isArray(customizations.remove_items) ? customizations.remove_items : [];

  function addProduct(item, quantity, person, isClothingChoice) {
    if (removed.includes(item.product_id)) return;
    const rawSelection = person?.sizes?.[item.product_id];
    const selection = rawSelection && typeof rawSelection === 'object' && !Array.isArray(rawSelection)
      ? rawSelection : {};
    if (person && item.requires_sizing) {
      const sizes = (item.sizes || []).map(size => typeof size === 'string' ? size : size.label);
      const colors = (item.colors || []).map(color => typeof color === 'string' ? color : color.name);
      if (sizes.length && !sizes.includes(selection.size)) {
        throw new ChildClothingError(`Select a valid size for ${item.name} for ${person.label}.`);
      }
      if (colors.length && !colors.includes(selection.color)) {
        throw new ChildClothingError(`Select a valid color for ${item.name} for ${person.label}.`);
      }
    }
    const selected_options = person
      ? { ...(item.selected_variants || {}), ...(selection.size ? { size: selection.size } : {}), ...(selection.color ? { color: selection.color } : {}), person: person.label, ...(isClothingChoice ? { clothing_choice: person.gender.toLowerCase() } : {}) }
      : item.selected_variants || null;
    output.push({ product_id: item.product_id, name: item.name, quantity, price_cents: item.price_cents, selected_options });
  }

  function qtyRule(rule, selectedPerson) {
    const matches = (selectedPerson ? [selectedPerson] : people).filter(person => {
      const child = person.label.startsWith('Child');
      const gender = person.gender.toLowerCase();
      switch (rule) {
        case 'per_person': return true;
        case 'per_adult': return !child;
        case 'per_child': return child;
        case 'per_adult_male': return !child && gender === 'male';
        case 'per_adult_female': return !child && gender === 'female';
        case 'per_child_male': return child && gender === 'male';
        case 'per_child_female': return child && gender === 'female';
        default: return false;
      }
    });
    return matches.length;
  }

  function walk(node, multiplier, selectedPerson = null, isClothingChoice = false) {
    if (node.is_child_clothing_choice) {
      for (let i = 0; i < multiplier; i++) {
        const child = children[childIndex++];
        const option = node.items.find(item => item.person_pack_gender === child.gender.toLowerCase());
        if (!option) throw new ChildClothingError('The selected child clothing pack is unavailable.');
        walk(option, 1, child, true);
      }
      return;
    }
    for (const item of node.items || []) {
      if (item.type === 'product') {
        const quantity = (item.qty_rule ? qtyRule(item.qty_rule, selectedPerson) : item.quantity) * multiplier;
        if (quantity > 0) addProduct(item, quantity, selectedPerson, isClothingChoice);
      } else if (item.is_child_clothing_choice) {
        walk(item, multiplier * item.quantity);
      } else if (item.is_person_slot && item.person_pack_age === 'adult' &&
                 ['male', 'female'].includes(item.person_pack_gender) && !selectedPerson) {
        const gender = item.person_pack_gender;
        const matching = people.filter(person => /^Adult(?:\s|$)/.test(person.label) && person.gender.toLowerCase() === gender);
        for (let i = 0; i < multiplier * item.quantity; i++) {
          const person = matching[adultIndices[gender]++];
          if (!person) throw new ChildClothingError('Please complete sizing for all adult clothing packs included in this kit.');
          walk(item, 1, person, isClothingChoice);
        }
      } else if (item.is_person_slot) {
        const matching = (selectedPerson ? [selectedPerson] : people).filter(person =>
          (item.person_pack_age === 'child' ? person.label.startsWith('Child') : !person.label.startsWith('Child')) &&
          (!item.person_pack_gender || item.person_pack_gender === person.gender.toLowerCase()));
        for (const person of matching) walk(item, multiplier, person, isClothingChoice);
      } else {
        walk(item, multiplier * item.quantity, selectedPerson, isClothingChoice);
      }
    }
  }
  walk(kit, 1);
  return output;
}

module.exports = { ChildClothingError, resolveChildClothingKit };
