import { db } from "./db";
import { users, teas, teaTypes, cultivars, siteSettings, heroPhrases, teaLogs, pages, footerLinks } from "../shared/schema.js";
import { eq, sql } from "drizzle-orm";

export async function seedProductionData() {
  const existingTeas = await db.select().from(teas);
  if (existingTeas.length > 0) {
    console.log("Production data already exists, skipping seed.");
    return;
  }

  console.log("Seeding production data...");

  const existingTeaTypes = await db.select().from(teaTypes);
  if (existingTeaTypes.length === 0) {
    await db.insert(teaTypes).values([
      { name: "Green", colorHue: 120, colorSaturation: 25, colorLightness: 40, sortOrder: 0 },
      { name: "Black", colorHue: 0, colorSaturation: 10, colorLightness: 25, sortOrder: 1 },
      { name: "Oolong", colorHue: 30, colorSaturation: 45, colorLightness: 50, sortOrder: 2 },
      { name: "White", colorHue: 66, colorSaturation: 0, colorLightness: 90, sortOrder: 3 },
      { name: "Yellow", colorHue: 45, colorSaturation: 50, colorLightness: 55, sortOrder: 4 },
      { name: "Dark", colorHue: 270, colorSaturation: 8, colorLightness: 30, sortOrder: 5 },
      { name: "Purple", colorHue: 280, colorSaturation: 30, colorLightness: 45, sortOrder: 6 },
      { name: "Butter Tea", colorHue: 35, colorSaturation: 50, colorLightness: 60, sortOrder: 7 },
      { name: "Herbal", colorHue: 85, colorSaturation: 35, colorLightness: 45, sortOrder: 8 },
      { name: "Powdered Tea", colorHue: 100, colorSaturation: 30, colorLightness: 50, sortOrder: 9 },
    ]);
    console.log("  Tea types seeded.");
  }

  const existingCultivars = await db.select().from(cultivars);
  if (existingCultivars.length === 0) {
    const cultivarNames = [
      "Yabukita", "Okumidori", "Saemidori", "Benifuuki", "Gokou",
      "Samidori", "Asatsuyu", "Kanayamidori", "Sayamakaori", "Meiryoku",
      "Sofu", "Yutakamidori", "Tsuyuhikari", "Okuhikari", "Komakage",
      "Fuushun", "Harumoegi", "Harumidori", "Kiraka", "Koushun",
      "Tie Guan Yin", "Huang Jin Gui", "Da Hong Pao", "Rou Gui", "Shui Xian",
      "Fo Shou", "Qi Lan", "Huang Guan Yin", "Jin Guan Yin", "Mei Zhan",
      "Ben Shan", "Mao Xie", "Qi Dan", "Bei Dou", "Ban Tian Yao",
      "Bai Ji Guan", "Tie Luo Han", "Shui Jin Gui", "Tong Tian Xiang", "Huang Dan",
      "Da Bai", "Xiao Bai", "Shui Xian (Fujian)", "Fu Ding Da Bai", "Zheng He Da Bai",
      "Yun Kang 10", "Menghai Da Ye", "Jing Gu Da Bai", "Feng Qing Da Ye", "Yunkang 14",
      "Fo Xiang", "Zi Juan", "Bai Ying", "Ge Deng", "Yi Wu",
      "Lao Cong", "Qing Xin", "Si Ji Chun", "Jin Xuan", "Cui Yu",
      "Ruby (TTES 18)", "Ying Xiang (TTES 12)", "Fo Shou (Taiwanese)", "Tie Guan Yin (Muzha)",
      "Qing Xin Oolong", "Qing Xin Da Mao", "Da Ye Oolong",
      "Assamica", "Sinensis", "Cambod",
      "Longjing 43", "Wuniu Zao", "Zhongcha 108", "Fuding Da Hao",
      "Zhuyeqi", "Huangshan Zhong", "Maofeng Zhong", "Taiping Houkui Zhong",
      "AV2", "P312", "T78", "Ambari", "Tocklai",
      "TRI 2025", "TRI 2043", "TRI 4049", "TRI 2023", "TRI 777",
      "TRFK 6/8", "TRFK 31/8", "Purple Hybrid", "Clone BB35",
      "Keemun Zhong", "Dianhong Zhong", "Zhengshan Xiaozhong",
      "Dancong (Mi Lan Xiang)", "Dancong (Ya Shi Xiang)", "Dancong (Zhi Lan Xiang)",
      "Dancong (Rou Gui Xiang)", "Dancong (Xing Ren Xiang)", "Dancong (Gui Hua Xiang)",
    ];
    await db.insert(cultivars).values(
      cultivarNames.map((name, i) => ({ name, sortOrder: i }))
    );
    console.log("  Cultivars seeded.");
  }

  const existingSettings = await db.select().from(siteSettings);
  if (existingSettings.length === 0) {
    await db.insert(siteSettings).values({
      siteName: "Tsun Brew",
      showSiteName: true,
      statusTag: "Open Alpha Build V1.5",
      logoUrl: "",
      displayFont: null,
      faviconUrl: null,
    });
    console.log("  Site settings seeded.");
  }

  const existingPhrases = await db.select().from(heroPhrases);
  if (existingPhrases.length === 0) {
    await db.insert(heroPhrases).values([
      { text: "From Icy Stares to Warm Sips.", sortOrder: 0 },
      { text: "Saving the Best Leaves... Strictly for You (I Guess).", sortOrder: 1 },
      { text: "It's not like we brewed this for you… or anything.", sortOrder: 2 },
      { text: "Cold at first sip, warm once you steep closer.", sortOrder: 3 },
      { text: "Cold Attitude, Hot Brews.", sortOrder: 4 },
      { text: "Unapologetically Bold, Subtly Sweet.", sortOrder: 5 },
      { text: "Don't Get the Wrong Idea… It's Just Tea.", sortOrder: 6 },
      { text: "I-I'm not brewing this just for you! ...Want another cup?", sortOrder: 7 },
      { text: "Not that I care if you stay... but the pot's still warm.", sortOrder: 8 },
      { text: "Fine. One cup. Don't get used to it.", sortOrder: 9 },
      { text: "It's bitter because you take too long to appreciate it, not because I made it that way.", sortOrder: 10 },
      { text: "T-take your time browsing... not that I'm waiting or anything.", sortOrder: 11 },
    ]);
    console.log("  Hero phrases seeded.");
  }

  const adminUser = await db.select().from(users).where(eq(users.username, "FanEcchyy"));
  if (adminUser.length > 0) {
    const adminId = adminUser[0].id;

    await db.insert(teas).values([
      {
        name: "Da Hong Pao",
        slug: "da-hong-pao",
        description: "",
        photoUrl: "https://i.postimg.cc/D72yP9nY/da-hong-pao-scaled.jpg",
        type: "Oolong",
        origin: "Wu Yi, Fujian, China",
        cultivar: [],
        averageScore: 0,
        recommendedTemp: 85,
        recommendedDuration: 60,
        orientalTemp: 95,
        orientalDuration: 15,
        orientalInfusionIncrement: 15,
        orientalMaxInfusions: 7,
        occidentalTemp: 90,
        occidentalDuration: 160,
        occidentalInfusions: [180, 182],
        washingStep: true,
        washingDuration: 10,
        orientalLeafAmount: "1g",
        orientalWaterAmount: "22.5ml",
        occidentalLeafAmount: "",
        occidentalWaterAmount: "",
        createdById: adminId,
      },
      {
        name: "Yue Guang Bai",
        slug: "yue-guang-bai",
        description: "",
        photoUrl: "https://i.postimg.cc/63w9mD6f/image.png",
        type: "White",
        origin: "Yunnan",
        cultivar: [],
        averageScore: 0,
        createdById: adminId,
      },
    ]);
    console.log("  Teas seeded.");

    const insertedTeas = await db.select().from(teas);
    const daHongPao = insertedTeas.find(t => t.name === "Da Hong Pao");
    const yueGuangBai = insertedTeas.find(t => t.name === "Yue Guang Bai");

    if (daHongPao && yueGuangBai) {
      await db.insert(teaLogs).values([
        { userId: adminId, teaId: yueGuangBai.id, status: "drinking", totalBrews: 0, currentInfusion: 1 },
        { userId: adminId, teaId: daHongPao.id, status: "drinking", totalBrews: 0, currentInfusion: 1 },
      ]);
      console.log("  Tea logs seeded.");
    }
  }

  const existingPages = await db.select().from(pages);
  if (existingPages.length === 0) {
    await db.insert(pages).values({
      slug: "about",
      title: "About",
      content: "Welcome to Tsun Brew - your tea discovery companion.\n\nWe are passionate about bringing the world of tea to enthusiasts everywhere. From delicate white teas to bold pu-erhs, our platform helps you discover, track, and brew teas from around the world.\n\nWhether you are just starting your tea journey or are a seasoned connoisseur, Tsun Brew provides the tools you need to explore and enjoy tea to its fullest.",
    });
    console.log("  Pages seeded.");
  }

  const existingFooterLinks = await db.select().from(footerLinks);
  if (existingFooterLinks.length === 0) {
    await db.insert(footerLinks).values({
      label: "About",
      pageSlug: "about",
      sortOrder: 0,
    });
    console.log("  Footer links seeded.");
  }

  console.log("Production data seeding complete.");
}
