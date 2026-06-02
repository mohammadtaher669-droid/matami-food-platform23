export const restaurants = [
  {
    id: "sabah-al-lail",
    name_en: "Sabah Al Lail",
    name_ar: "صباح الليل",
    logo: "🌙",
    color: "#6A0DAD",
    description_en: "Authentic late-night dining experience",
    description_ar: "تجربة عشاء أصيلة في أوقات متأخرة من الليل",
    branches: [
      {
        id: "sabah-riyadh",
        name_en: "Riyadh Branch",
        name_ar: "فرع الرياض",
        whatsapp: "966501234567",
        open: "18:00",
        close: "02:00",
        delivery_fee: 15,
        address_en: "King Fahd Road, Riyadh",
        address_ar: "طريق الملك فهد، الرياض"
      },
      {
        id: "sabah-jeddah",
        name_en: "Jeddah Branch",
        name_ar: "فرع جدة",
        whatsapp: "966502345678",
        open: "17:00",
        close: "03:00",
        delivery_fee: 12,
        address_en: "Corniche Road, Jeddah",
        address_ar: "طريق الكورنيش، جدة"
      }
    ]
  },
  {
    id: "asad-al-hamra",
    name_en: "Asad Al Hamra",
    name_ar: "أسد الحمرا",
    logo: "🦁",
    color: "#C1121F",
    description_en: "Bold flavors and legendary grills",
    description_ar: "نكهات جريئة وشوايات أسطورية",
    branches: [
      {
        id: "asad-riyadh",
        name_en: "Riyadh Branch",
        name_ar: "فرع الرياض",
        whatsapp: "966503456789",
        open: "12:00",
        close: "01:00",
        delivery_fee: 10,
        address_en: "Olaya District, Riyadh",
        address_ar: "حي العليا، الرياض"
      },
      {
        id: "asad-dammam",
        name_en: "Dammam Branch",
        name_ar: "فرع الدمام",
        whatsapp: "966504567890",
        open: "11:00",
        close: "00:00",
        delivery_fee: 18,
        address_en: "King Abdullah Road, Dammam",
        address_ar: "طريق الملك عبدالله، الدمام"
      }
    ]
  },
  {
    id: "chickens-bar",
    name_en: "Chickens Bar",
    name_ar: "شيكنز بار",
    logo: "🍗",
    color: "#FF3D00",
    description_en: "The finest crispy chicken in town",
    description_ar: "أفضل دجاج مقرمش في المدينة",
    branches: [
      {
        id: "chickens-riyadh",
        name_en: "Riyadh Branch",
        name_ar: "فرع الرياض",
        whatsapp: "966505678901",
        open: "10:00",
        close: "02:00",
        delivery_fee: 8,
        address_en: "Tahlia Street, Riyadh",
        address_ar: "شارع التحلية، الرياض"
      },
      {
        id: "chickens-mecca",
        name_en: "Mecca Branch",
        name_ar: "فرع مكة",
        whatsapp: "966506789012",
        open: "09:00",
        close: "03:00",
        delivery_fee: 20,
        address_en: "Ibrahim Al Khalil Road, Mecca",
        address_ar: "طريق إبراهيم الخليل، مكة"
      }
    ]
  }
];

export const menuItems = [
  // Sabah Al Lail menu
  { id: "sal-1", restaurant_id: "sabah-al-lail", name_en: "Karak Tea", name_ar: "شاي كرك", price: 8, category_en: "Drinks", category_ar: "مشروبات", description_en: "Rich spiced tea", description_ar: "شاي بالبهارات الغنية", popular: true },
  { id: "sal-2", restaurant_id: "sabah-al-lail", name_en: "Mixed Grill Platter", name_ar: "طبق مشاوي مشكلة", price: 85, category_en: "Mains", category_ar: "الأطباق الرئيسية", description_en: "Assorted grilled meats", description_ar: "لحوم مشوية متنوعة", popular: true },
  { id: "sal-3", restaurant_id: "sabah-al-lail", name_en: "Hummus with Meat", name_ar: "حمص باللحمة", price: 28, category_en: "Starters", category_ar: "المقبلات", description_en: "Creamy hummus topped with spiced meat", description_ar: "حمص كريمي مع اللحم المتبل" },
  { id: "sal-4", restaurant_id: "sabah-al-lail", name_en: "Fattoush Salad", name_ar: "سلطة فتوش", price: 22, category_en: "Salads", category_ar: "السلطات", description_en: "Fresh Levantine salad", description_ar: "سلطة شامية طازجة" },
  { id: "sal-5", restaurant_id: "sabah-al-lail", name_en: "Kunafa", name_ar: "كنافة", price: 32, category_en: "Desserts", category_ar: "الحلويات", description_en: "Traditional cheese kunafa", description_ar: "كنافة جبنة تقليدية", popular: true },
  { id: "sal-6", restaurant_id: "sabah-al-lail", name_en: "Lamb Kabsa", name_ar: "كبسة لحم", price: 75, category_en: "Mains", category_ar: "الأطباق الرئيسية", description_en: "Aromatic rice with tender lamb", description_ar: "أرز عطري مع لحم طري" },
  
  // Asad Al Hamra menu
  { id: "aah-1", restaurant_id: "asad-al-hamra", name_en: "Lion Burger", name_ar: "برغر الأسد", price: 48, category_en: "Burgers", category_ar: "البرغر", description_en: "Double smash patty with special sauce", description_ar: "باتي مزدوج مع صوص خاص", popular: true },
  { id: "aah-2", restaurant_id: "asad-al-hamra", name_en: "Beef Ribs", name_ar: "ريش البقر", price: 120, category_en: "Grills", category_ar: "الشوايات", description_en: "Slow-cooked beef ribs with BBQ glaze", description_ar: "ريش بقر بطيئة الطهي مع صوص باربيكيو", popular: true },
  { id: "aah-3", restaurant_id: "asad-al-hamra", name_en: "Crispy Wings", name_ar: "أجنحة مقرمشة", price: 38, category_en: "Starters", category_ar: "المقبلات", description_en: "Crispy chicken wings with choice of sauce", description_ar: "أجنحة دجاج مقرمشة مع اختيار الصوص" },
  { id: "aah-4", restaurant_id: "asad-al-hamra", name_en: "Onion Rings", name_ar: "حلقات البصل", price: 18, category_en: "Sides", category_ar: "الإضافات", description_en: "Golden crispy onion rings", description_ar: "حلقات بصل ذهبية مقرمشة" },
  { id: "aah-5", restaurant_id: "asad-al-hamra", name_en: "Fresh Lemonade", name_ar: "ليمونادة طازجة", price: 14, category_en: "Drinks", category_ar: "المشروبات", description_en: "Fresh-squeezed lemonade", description_ar: "عصير ليمون طازج" },
  { id: "aah-6", restaurant_id: "asad-al-hamra", name_en: "Chocolate Lava Cake", name_ar: "كيك الشوكولاتة المنصهر", price: 28, category_en: "Desserts", category_ar: "الحلويات", description_en: "Warm chocolate lava cake", description_ar: "كيك شوكولاتة دافئ منصهر" },

  // Chickens Bar menu
  { id: "cb-1", restaurant_id: "chickens-bar", name_en: "Crispy Chicken Box", name_ar: "صندوق الدجاج المقرمش", price: 42, category_en: "Boxes", category_ar: "الصناديق", description_en: "4-piece crispy chicken with fries & coleslaw", description_ar: "4 قطع دجاج مقرمش مع بطاطس ملفوف", popular: true },
  { id: "cb-2", restaurant_id: "chickens-bar", name_en: "Chicken Burger", name_ar: "برغر الدجاج", price: 35, category_en: "Burgers", category_ar: "البرغر", description_en: "Crispy chicken fillet burger", description_ar: "برغر فيليه دجاج مقرمش", popular: true },
  { id: "cb-3", restaurant_id: "chickens-bar", name_en: "Spicy Wings (6 pcs)", name_ar: "أجنحة حارة (6 قطع)", price: 32, category_en: "Wings", category_ar: "الأجنحة", description_en: "Hot & spicy wings", description_ar: "أجنحة حارة ومتبلة" },
  { id: "cb-4", restaurant_id: "chickens-bar", name_en: "Loaded Fries", name_ar: "بطاطس محملة", price: 22, category_en: "Sides", category_ar: "الإضافات", description_en: "Fries topped with cheese sauce & jalapeños", description_ar: "بطاطس مع صوص الجبنة والهالبينيو" },
  { id: "cb-5", restaurant_id: "chickens-bar", name_en: "Strawberry Milkshake", name_ar: "ميلك شيك فراولة", price: 18, category_en: "Drinks", category_ar: "المشروبات", description_en: "Thick creamy strawberry shake", description_ar: "ميلك شيك فراولة كريمي كثيف" },
  { id: "cb-6", restaurant_id: "chickens-bar", name_en: "Grilled Chicken Wrap", name_ar: "راب الدجاج المشوي", price: 28, category_en: "Wraps", category_ar: "الراب", description_en: "Grilled chicken with fresh veggies", description_ar: "دجاج مشوي مع خضروات طازجة" },
];

export const coupons = [
  { code: "SAVE10", type: "percentage", value: 10, active: true, description_en: "10% off your order", description_ar: "خصم 10% على طلبك" },
  { code: "FIRST20", type: "percentage", value: 20, active: true, description_en: "20% first-time discount", description_ar: "خصم 20% للمرة الأولى" },
  { code: "FREESHIP", type: "free_delivery", value: 0, active: true, description_en: "Free delivery", description_ar: "توصيل مجاني" },
];