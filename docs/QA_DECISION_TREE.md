# Survival Kit Builder - Q&A Decision Tree

## How the Q&A Works

When a user takes the quiz, they answer questions. Based on their answers, they get recommended a specific kit.

Example:
- User answers "Solo Hiking" → System recommends "Solo Trekker Kit"
- User answers "Family Camping" + "3 days" → System recommends "Family Weekend Kit"

---

## Question Flow

### Question 1: "What is your main use case?"
**Position:** 1

**Answer Options:**
| Answer | Text | Leads To | Kit Recommendation |
|--------|------|----------|-------------------|
| a-1 | Solo Hiking/Backpacking | Question 2 (How many days?) | (depends on Q2) |
| a-2 | Family Camping | Question 2 (How many days?) | (depends on Q2) |
| a-3 | Emergency Home Preparedness | (direct result) | kit-urban-emergency |
| a-4 | Vehicle Emergency Kit | (direct result) | kit-vehicle-survival |
| a-5 | Medical/First Aid Focus | Question 2 (Medical type?) | (depends on Q2) |

---

### Question 2A: "How many days?" (if Solo Hiking selected)
**Position:** 2
**Only shown if:** User selected "Solo Hiking" (a-1)

**Answer Options:**
| Answer | Text | Recommended Kit |
|--------|------|-----------------|
| a-6 | Day hike (under 8 hours) | kit-solo-day-hiker |
| a-7 | 1-2 days/nights | kit-solo-overnight |
| a-8 | 3-5 days/nights | kit-solo-weekend-explorer |
| a-9 | 7+ days/nights | kit-solo-expedition |

---

### Question 2B: "How many days?" (if Family Camping selected)
**Position:** 2
**Only shown if:** User selected "Family Camping" (a-2)

**Answer Options:**
| Answer | Text | Recommended Kit |
|--------|------|-----------------|
| a-10 | 1-2 days (weekend) | kit-family-weekend |
| a-11 | 3-5 days | kit-family-adventure |
| a-12 | 7+ days | kit-family-extended-expedition |

---

### Question 2C: "What type of medical prep?" (if Medical Focus selected)
**Position:** 2
**Only shown if:** User selected "Medical/First Aid Focus" (a-5)

**Answer Options:**
| Answer | Text | Recommended Kit |
|--------|------|-----------------|
| a-13 | Basic first aid | kit-basic-medical |
| a-14 | Advanced first aid + trauma | kit-tactical-medical |
| a-15 | Travel/adventure medical | kit-adventure-medical |

---

## Sample Kits & Their Contents

### Kit 1: Solo Day Hiker Kit
**Kit ID:** kit-solo-day-hiker
**Base Bag:** Day Pack (20L)
**Contents:**
- Water Bottle (1L) - qty: 1
- Energy Bars (pack of 5) - qty: 1
- Trail Mix (250g) - qty: 1
- Basic First Aid Kit - qty: 1
- Multi-tool - qty: 1
- Hat - qty: 1
- Extra Socks - qty: 1

**Base Price:** $89.99

---

### Kit 2: Solo Overnight Kit
**Kit ID:** kit-solo-overnight
**Base Bag:** Hiking Backpack (35L)
**Contents:**
- Water Bottle (1L) - qty: 2
- Water Filter - qty: 1
- Freeze-dried Meals - qty: 2
- Energy Bars - qty: 1
- Trail Mix - qty: 1
- Sleeping Bag (lightweight) - qty: 1
- Tent (solo) - qty: 1
- First Aid Kit - qty: 1
- Flashlight - qty: 1
- Matches/Lighter - qty: 1
- Multi-tool - qty: 1
- Hat - qty: 1
- Gloves - qty: 1

**Base Price:** $199.99

---

### Kit 3: Urban Emergency Kit
**Kit ID:** kit-urban-emergency
**Base Bag:** Tactical Backpack (35L)
**Contents:**
- Water Bottles (1L) - qty: 4
- Water Purification Tablets - qty: 1
- Canned/Freeze-dried Food - qty: 5
- Advanced First Aid Kit - qty: 1
- Medications (pain relief, anti-diarrheal) - qty: 1
- Multi-tool - qty: 1
- Pry Bar - qty: 1
- Flashlight - qty: 1
- Whistle - qty: 1
- Waterproof Document Case - qty: 1
- Phone Charger (USB) - qty: 1
- Face Masks - qty: 10

**Base Price:** $199.99

---

### Kit 4: Family Weekend Kit
**Kit ID:** kit-family-weekend
**Base Bag:** Family Backpack (60L)
**Contents:**
- Water Bottles (1L) - qty: 4
- Water Filter - qty: 1
- Freeze-dried Family Meals - qty: 4
- Snacks - qty: 3
- Sleeping Bags - qty: 4
- Family Tent (4-person) - qty: 1
- First Aid Kit (comprehensive) - qty: 1
- Multi-tool - qty: 2
- Flashlights - qty: 2
- Cooking Pot + Utensils - qty: 1
- Hats - qty: 4
- Gloves - qty: 4

**Base Price:** $349.99

---

## Customization Options (After Kit is Recommended)

### 1. Bag Size
- **Small (-15%):** Reduces price by 15%
- **Medium (base):** Standard price
- **Large (+20%):** Increases price by 20%
- **Extra Large (+30%):** Increases price by 30%

### 2. Add Items
Users can add extra products to their kit:
- Extra water bottles
- Medical supplies (bandages, pain relief)
- Food packs
- Clothing items
- Tools
- Each item has its own price that gets added to total

### 3. Remove Items
Users can remove default kit items:
- Item is removed from the kit
- Item price is deducted from total

---

## Price Calculation Logic

```
Final Price = Kit Base Price
            + Bag Size Adjustment (% of base)
            + Sum of Added Items
            - Sum of Removed Items
```

**Example:**
- Base Kit: $259.99
- Upgrade to Large bag: +$52.00 (20%)
- Add Backup Power Bank: +$30.00
- Remove Sleeping Bag: -$80.00
- **Final Total: $261.99**

---

## How to Add This to the Database (SQL)

### Insert Questions:
```sql
INSERT INTO qa_questions (text, position) VALUES
('What is your main use case?', 1),
('How many days?', 2),
('What type of medical prep?', 2);
```

### Insert Answers (simplified example):
```sql
INSERT INTO qa_answers (question_id, text, result_kit_id) VALUES
-- Question 1 answers
((SELECT id FROM qa_questions WHERE position=1), 'Solo Hiking/Backpacking', NULL),
((SELECT id FROM qa_questions WHERE position=1), 'Family Camping', NULL),
((SELECT id FROM qa_questions WHERE position=1), 'Emergency Home Preparedness', (SELECT id FROM kits WHERE name='Urban Emergency Kit')),
-- Question 2 answers (Solo Hiking path)
((SELECT id FROM qa_questions WHERE position=2), 'Day hike (under 8 hours)', (SELECT id FROM kits WHERE name='Solo Day Hiker Kit')),
((SELECT id FROM qa_questions WHERE position=2), '1-2 days/nights', (SELECT id FROM kits WHERE name='Solo Overnight Kit'));
```

---

## Implementation Notes

- **Terminal answers:** result_kit_id has a value — directly recommends a kit
- **Non-terminal answers:** result_kit_id is NULL — leads to another question
- **Multiple Q2 variants:** Different second questions show depending on Q1 answer
- **Price customization:** Bag sizes are % adjustments; add/remove items are fixed prices
