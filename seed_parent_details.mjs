import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Student from "./models/student.model.js";

const studentData = [
  {
    name: "Ali Imran Mapari",
    email: "alimapari12345@gmail.com",
    phoneNo: "7506565137",
    fatherName: "Imran Mapari",
    fatherPhone: "9322462975",
    fatherEmail: "imranmapari0123@gmail.com",
    motherName: "Atika Mapari",
    motherPhone: "9222125203",
    motherEmail: ""
  },
  {
    name: "Alijah Ahmed Hussain Malik",
    email: "2021malikalijah24441khs@gmail.com",
    phoneNo: "9555102345",
    fatherName: "Ahmed Hussain Malik",
    fatherPhone: "8169951982",
    fatherEmail: "littleantaryami@gmail.com",
    motherName: "SHAGUFTA Malik",
    motherPhone: "9137329837",
    motherEmail: "shaguftam378@gmail.com"
  },
  {
    name: "Anam Abdur Rauf Choudhary",
    email: "canam2117@gmail.com",
    phoneNo: "9967231023",
    fatherName: "Abdur Rauf Choudhary",
    fatherPhone: "9869122165",
    fatherEmail: "abdurrachaudhary@gmail.com",
    motherName: "FARZANA Choudhary",
    motherPhone: "9029646350",
    motherEmail: "sohaibchoudhry27@gmail.com"
  },
  {
    name: "Fahad Irshad Shaikh",
    email: "f7226656@gmail.com",
    phoneNo: "8850171375",
    fatherName: "Irshad Shaikh",
    fatherPhone: "9779972982",
    fatherEmail: "",
    motherName: "Ruksar Shaikh",
    motherPhone: "9223316137",
    motherEmail: "asadullahsawant@gmail.com"
  },
  {
    name: "Faraz Feroz Khan",
    email: "farazkhanrules24@gmail.com",
    phoneNo: "9321130694",
    fatherName: "Feroz Shafi Khan",
    fatherPhone: "9987263641",
    fatherEmail: "fksiaretech@gmail.com",
    motherName: "Farzinda Feroz Khan",
    motherPhone: "7021128628",
    motherEmail: ""
  },
  {
    name: "FARHAT BANO AHRAR SHAIKH",
    email: "farhatbano9606@gmail.com",
    phoneNo: "7268948096",
    fatherName: "AHRAR AHMED SHAIKH",
    fatherPhone: "7268948096",
    fatherEmail: "ahrarazmi1978@gmail.com",
    motherName: "RUBINA BANO SHAIKH",
    motherPhone: "9082238025",
    motherEmail: "rubinabano72689@gmail.com"
  },
  {
    name: "Kainat Farid Khan",
    email: "khankainat0956@gmail.com",
    phoneNo: "9920839304",
    fatherName: "FAREED KHAN",
    fatherPhone: "9867549073",
    fatherEmail: "khanfareed9067@gmail.com",
    motherName: "NUZHAT FAREED KHAN",
    motherPhone: "9004581215",
    motherEmail: ""
  },
  {
    name: "MUHAMMED AHMED MOHARRAM ALI SIDDIQUI",
    email: "mohdalisidiquui@gmail.com",
    phoneNo: "9387370473",
    fatherName: "Mr. MOHARRAM ALI MOHAMMAD GANI SIDDIQUI",
    fatherPhone: "9987169441",
    fatherEmail: "mohdaliqqq54@gmail.com",
    motherName: "Mrs. GUDIYA BANO SIDDIQUI",
    motherPhone: "9137924040",
    motherEmail: "mohammadahmedsiddiqui891@gmail.com"
  },
  {
    name: "MUHAMMED SAAMI SHUEB KHANZADAH",
    email: "saamikhanzadah17@gmail.com",
    phoneNo: "9967519063",
    fatherName: "SHUEB ABDUL RAHEEM KHANZADAH",
    fatherPhone: "9820420664",
    fatherEmail: "Shuebkhanzadah84@gmail.com",
    motherName: "Mrs. SADAF SHUEB KHANZADAH",
    motherPhone: "9833325011",
    motherEmail: "Sadafkhanzadah@gmail.com"
  },
  {
    name: "Tushar Rajesh Sutar",
    email: "tsutar1410@gmail.com",
    phoneNo: "9867652885",
    fatherName: "Mr. Rajesh Sutar",
    fatherPhone: "8369379852",
    fatherEmail: "raj3sutar@gmail.com",
    motherName: "Mrs. Shanti Sutar",
    motherPhone: "9137089312",
    motherEmail: ""
  },
  {
    name: "ALISHA ZAKIR HUSSAIN SHAH",
    email: "alishashah7350@gmail.com",
    phoneNo: "8104862845",
    fatherName: "Mr. Zakir Hussain Shah",
    fatherPhone: "9702734727",
    fatherEmail: "zakirhusain0895@gmail.com",
    motherName: "Mrs. AYESHA ZAKIR SHAH",
    motherPhone: "8104862845",
    motherEmail: ""
  },
  {
    name: "Atifa Khatoon Mohd Ayyub",
    email: "atifaansari72@gmail.com",
    phoneNo: "9092127981",
    fatherName: "MOHAMMED AYYUB ANSARI",
    fatherPhone: "9773774500",
    fatherEmail: "mdayyub3@gmail.com",
    motherName: "FRIDA KHATOON AYYUB",
    motherPhone: "9664715486",
    motherEmail: "faridaansari576@gmail.com"
  },
  {
    name: "AZFER RAEES KHAN",
    email: "azferkhan5561@gmail.com",
    phoneNo: "9619928792",
    fatherName: "RAEES AHMAD KHAN",
    fatherPhone: "9372990620",
    fatherEmail: "raees888@gmail.com",
    motherName: "RAFIA RAEES KHAN",
    motherPhone: "8159850928",
    motherEmail: "rafiakhan2013.rk@gmail.com"
  },
  {
    name: "IFRA AHMED MALIK",
    email: "malikifraa0@gmail.com",
    phoneNo: "9137500299",
    fatherName: "AHMED HUSSAIN MALIK",
    fatherPhone: "8169756174",
    fatherEmail: "littleantaryami@gmail.com",
    motherName: "Mrs. SHAGUFTAH MALIK",
    motherPhone: "9137329837",
    motherEmail: "shaguftam378@gmail.com"
  },
  {
    name: "Ikrama Mohammed Talha Chavte",
    email: "ghavteikrama@gmail.com",
    phoneNo: "7045235487",
    fatherName: "MOHAMMAD TALHA CHAVTE",
    fatherPhone: "9892790760",
    fatherEmail: "ghavtetalha@gmail.com",
    motherName: "RAMEESA TALHA CHAVTE",
    motherPhone: "7977188473",
    motherEmail: "rghavte30@gmail.com"
  },
  {
    name: "Mirza Ubaid beg",
    email: "begmirzaubaid@gmail.com",
    phoneNo: "8948503809",
    fatherName: "Abdul Mueed Beg",
    fatherPhone: "6394317516",
    fatherEmail: "abdulmueedbaig@gmail.com",
    motherName: "AZIZ Baig",
    motherPhone: "9120166021",
    motherEmail: "azizbaig1441@gmail.com"
  },
  {
    name: "MOHAMMED AHMED PATEL",
    email: "ahmed.patel.nxi24@gmail.com",
    phoneNo: "9619357952",
    fatherName: "Mr. AZIZ ABDUL PATEL",
    fatherPhone: "9867369786",
    fatherEmail: "abdulazizth9@gmail.com",
    motherName: "DILNAWAZ AZIZ PATEL",
    motherPhone: "9519594558",
    motherEmail: "dilnawazpatel3@gmail.com"
  },
  {
    name: "Mohammed Ayan Imtiyaz Sayed",
    email: "mohammedayansayed123@gmail.com",
    phoneNo: "8879398010",
    fatherName: "Imtiyaz Munawer Sayed",
    fatherPhone: "8650060010",
    fatherEmail: "nisayed77@gmail.com",
    motherName: "Imtiyaz Munawer Sayed",
    motherPhone: "8169899593",
    motherEmail: "isayed77@gmail.com"
  },
  {
    name: "Rehman Zuber Khan",
    email: "arehman43381@gmail.com",
    phoneNo: "9594660387",
    fatherName: "Zuber Khan",
    fatherPhone: "8369267380",
    fatherEmail: "zubairkhanzubair905@gmail.com",
    motherName: "Mehroz Khan",
    motherPhone: "9594660387",
    motherEmail: "mahroz786.mk@gmail.com"
  },
  {
    name: "Shifa Anjum Inamulhaq Ansari",
    email: "ansarishifa1509@gmail.com",
    phoneNo: "8097863897",
    fatherName: "Mr. Inamulhaq Ansari",
    fatherPhone: "9152142670",
    fatherEmail: "inamulhaqansari57@gmail.com",
    motherName: "Mrs. Tabassum Ansari",
    motherPhone: "9325588760",
    motherEmail: "tabassumansari198311@gmail.com"
  },
  {
    name: "Sohel Usman Gani Shah",
    email: "shahsoheil5553@gmail.com",
    phoneNo: "9867020122",
    fatherName: "Mr. Usman Gani Shah",
    fatherPhone: "9892696567",
    fatherEmail: "shahuamangani@gmail.com",
    motherName: "Mrs. Mariyam Shah",
    motherPhone: "9887858421",
    motherEmail: "as2420730@gmail.com"
  },
  {
    name: "Mohd Ahmed Khan",
    email: "aaddy.uly143@gmail.com",
    phoneNo: "9284299128",
    fatherName: "Mr. WASEEM Khan",
    fatherPhone: "8805531690",
    fatherEmail: "shadabwaseem904@gmail.com",
    motherName: "",
    motherPhone: "",
    motherEmail: ""
  },
  {
    name: "Mohd Irfan Mohd Noor Alam Shaikh",
    email: "i2992035@gmail.com",
    phoneNo: "7715053367",
    fatherName: "Mr. MD NOORALAMM Alam Shaikh",
    fatherPhone: "9768415530",
    fatherEmail: "nooralam942@gmail.com",
    motherName: "Mrs. Saira Tabassum Alam Shaikh",
    motherPhone: "9967699460",
    motherEmail: "tabassumsaira247@gmail.com"
  },
  {
    name: "Ramzan Shamshad Khan",
    email: "ramzankhan4212@gmail.com",
    phoneNo: "9920136318",
    fatherName: "Naushad Khan",
    fatherPhone: "9004353427",
    fatherEmail: "Naushad180khan@gmail.com",
    motherName: "Shaban Khan",
    motherPhone: "9967252461",
    motherEmail: "shabankhan4373@gmail.com"
  },
  {
    name: "Sahil Seraj Ahmed Ansari",
    email: "sahilansari9867747153@gmail.com",
    phoneNo: "9867747153",
    fatherName: "Mr. Seraj Ansari",
    fatherPhone: "9867336255",
    fatherEmail: "saahilllansarii@gmail.com",
    motherName: "Mrs. AFROZ JAHAN Ansari",
    motherPhone: "9136047153",
    motherEmail: "ansariseraj6255@gmail.com"
  },
  {
    name: "Sudeep Prashant Das",
    email: "sudeepdas2525@zohomail.in",
    phoneNo: "7208109720",
    fatherName: "Mr. Prashant Subal Das",
    fatherPhone: "9967696314",
    fatherEmail: "prashantsubal911@gmail.com",
    motherName: "Mrs. Seema Prashant Das",
    motherPhone: "8097493859",
    motherEmail: "seemadas2525@gmail.com"
  },
  {
    name: "Tamanna Sahib jahan Ansari",
    email: "ansaritamanna23102006@gmail.com",
    phoneNo: "9911830554",
    fatherName: "Nijamuddin Ansari",
    fatherPhone: "9921481166",
    fatherEmail: "nijamuddinansari357@gmail.com",
    motherName: "Asreen Ansari",
    motherPhone: "8287321353",
    motherEmail: "ansariasreen@gmail.com"
  },
  {
    name: "Uzer Yusuf Sayed",
    email: "Sayeduzer2001@gmail.com",
    phoneNo: "9930097075",
    fatherName: "Saniya Sayed",
    fatherPhone: "9019004906",
    fatherEmail: "saniyasayed300@gmail.com",
    motherName: "Mrs. Shaheen Yusuf Sayed",
    motherPhone: "9020205745",
    motherEmail: "shaheensayed1973@gmail.com"
  },
  {
    name: "Vishesh Shivlal Jaiswar",
    email: "visheshjaiswar009@gmail.com",
    phoneNo: "8828949831",
    fatherName: "Mr. Shivlal Jaiswar",
    fatherPhone: "7021731962",
    fatherEmail: "shivlaljaiswar009@gmail.com",
    motherName: "Mrs. Reena Jaiswar",
    motherPhone: "8356881127",
    motherEmail: "reenasjfx009@gmail.com"
  },
  {
    name: "Zaid Riyaz Khan",
    email: "zkhan023761@gmail.com",
    phoneNo: "9019714192",
    fatherName: "Mr. RIYAZ SHAFIR KHAN",
    fatherPhone: "9019714192",
    fatherEmail: "riyazkhanfiroja@gmail.com",
    motherName: "Mrs. FIROZA RIYAZ KHAN",
    motherPhone: "9324456190",
    motherEmail: "firozasanakhankhan@gmail.com"
  },
  {
    name: "Affan Rizwan Khan",
    email: "krumana496@gmail.com",
    phoneNo: "7208949865",
    fatherName: "Rizwan Khan",
    fatherPhone: "7021543907",
    fatherEmail: "",
    motherName: "RUMANA Khan",
    motherPhone: "7021543907",
    motherEmail: "krumana496@gmail.com"
  },
  {
    name: "Faiz Ahmed Moiz Ahmed Shaikh",
    email: "faizsk297@gmail.com",
    phoneNo: "9773662550",
    fatherName: "Mr. Moiz Ahmed Shaikh",
    fatherPhone: "8108144804",
    fatherEmail: "moiz.shk0801@gmail.com",
    motherName: "",
    motherPhone: "",
    motherEmail: ""
  },
  {
    name: "Farhan Faiyaz Tolkar",
    email: "farhantolkar22@gmail.com",
    phoneNo: "9010491975",
    fatherName: "Mr. Faiyaz Alimiya Tolkar",
    fatherPhone: "9422694955",
    fatherEmail: "faiyaztolkar9455@gmail.com",
    motherName: "Rehana Faiyaz Tolkar",
    motherPhone: "8830574835",
    motherEmail: "fawzantolkar1449@gmail.com"
  },
  {
    name: "Iqfat Nasir Shaikh",
    email: "sheikhiqfat@gmail.com",
    phoneNo: "8106557503",
    fatherName: "Mr. Nasir sheikh Shaikh",
    fatherPhone: "9322655469",
    fatherEmail: "nasir.shk075@gmail.com",
    motherName: "Rubina Shaikh",
    motherPhone: "8106622778",
    motherEmail: "rubyrsn0@gmail.com"
  },
  {
    name: "Kazim Shahid Raza Salmani",
    email: "mehnazsalmani2@gmail.com",
    phoneNo: "9326106005",
    fatherName: "Mr. Shahid Raza Salmani Salm",
    fatherPhone: "7506087492",
    fatherEmail: "shahid.salmani1981@gmail.com",
    motherName: "Mrs. Mehnaz Salmani",
    motherPhone: "8928794481",
    motherEmail: ""
  },
  {
    name: "Mohammed Asif Abdul Rehman Sayyed",
    email: "asifsayyed614@gmail.com",
    phoneNo: "9152093633",
    fatherName: "Abdul Rehman Sayyed",
    fatherPhone: "9987924762",
    fatherEmail: "",
    motherName: "SHAKILA BANO Sayyed",
    motherPhone: "8424936314",
    motherEmail: "shakilasayyed578@gmail.com"
  },
  {
    name: "Mohd Taha Mohd Yusuf Choudhary",
    email: "tahachoudhary54@gmail.com",
    phoneNo: "9967343330",
    fatherName: "Mr. MOHD YUSUF Choudhary",
    fatherPhone: "7777003323",
    fatherEmail: "asadtraders1982@gmail.com",
    motherName: "Talha Choudhary",
    motherPhone: "9967343331",
    motherEmail: "choudharaytalha946@gmail.com"
  },
  {
    name: "Mohd Yaseen Baban Sayyed",
    email: "sayyedyasin669@gmail.com",
    phoneNo: "7039205435",
    fatherName: "Mr. Wasim Sayyed",
    fatherPhone: "9220858319",
    fatherEmail: "wanasri008@gmail.com",
    motherName: "Mrs. Shahnaz Sayyed",
    motherPhone: "8879586041",
    motherEmail: "shanaazsayyed09@gmail.com"
  },
  {
    name: "Nafisa Ali Ahmed Khan",
    email: "naffakhan3@gmail.com",
    phoneNo: "7506996943",
    fatherName: "Mr. ALI AHMED Khan",
    fatherPhone: "9819996906",
    fatherEmail: "tamannakhan141456@gmail.com",
    motherName: "Tamanna Khan",
    motherPhone: "9372170906",
    motherEmail: ""
  },
  {
    name: "Obaidullah Mohd Zahiruddin Shaikh",
    email: "obaidullahshaikh07@gmail.com",
    phoneNo: "9092440770",
    fatherName: "Mr. MOHD ZAHIRUDDIN Shaikh",
    fatherPhone: "9322147965",
    fatherEmail: "shaikhzahir14g9@gmail.com",
    motherName: "saheema Shaikh",
    motherPhone: "7045693769",
    motherEmail: "rehmanshaikha06@gmail.com"
  },
  {
    name: "Piyush Jayprakash Patwa",
    email: "patwepiyush940@gmail.com",
    phoneNo: "9519625701",
    fatherName: "Mr. JAYPRAKASH Patwa",
    fatherPhone: "9224530288",
    fatherEmail: "abhikeshpatwa@gmail.com",
    motherName: "Mrs. Seema Patwa",
    motherPhone: "7039080783",
    motherEmail: "prachipatwa031@gmail.com"
  },
  {
    name: "Pravin Mohana Sundaram Chettiar",
    email: "pravinchettiar96@gmail.com",
    phoneNo: "8850935147",
    fatherName: "Mr. Mohanasundaram Chettiar",
    fatherPhone: "9092567504",
    fatherEmail: "krishdarshan1989@gmail.com",
    motherName: "",
    motherPhone: "7715066246",
    motherEmail: ""
  },
  {
    name: "Sajiya Badruduja Shaikh",
    email: "sajiyashaikh811@gmail.com",
    phoneNo: "9930653385",
    fatherName: "Mr. Badruduja Badruduja Shai",
    fatherPhone: "8169220652",
    fatherEmail: "badrushaikh571@gmail.com",
    motherName: "Naziya Shaikh",
    motherPhone: "8857362699",
    motherEmail: "naazs1137@gmail.com"
  },
  {
    name: "Sanskar Sunil Ashan",
    email: "sanskarashan1@gmail.com",
    phoneNo: "9082903203",
    fatherName: "",
    fatherPhone: "",
    fatherEmail: "",
    motherName: "Mrs. Nirmala Ashan",
    motherPhone: "9833351811",
    motherEmail: "snirmalaashan@gmail.com"
  }
];

async function updateParentData() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB.");

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const item of studentData) {
      // Find student by email (case-insensitive) or name
      const student = await Student.findOne({
        $or: [
          { email: new RegExp(`^${item.email}$`, "i") },
          { name: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") }
        ]
      });

      if (student) {
        if (item.phoneNo) student.phoneNo = item.phoneNo;
        student.fatherName = item.fatherName;
        student.fatherPhone = item.fatherPhone;
        student.fatherEmail = item.fatherEmail;
        student.motherName = item.motherName;
        student.motherPhone = item.motherPhone;
        student.motherEmail = item.motherEmail;

        if (item.fatherPhone || item.motherPhone) {
          student.parentPhoneNo = item.fatherPhone || item.motherPhone;
        }
        if (item.fatherEmail || item.motherEmail) {
          student.parentEmail = item.fatherEmail || item.motherEmail;
        }

        // Save WITHOUT touching password or batch fields
        await student.save();
        updatedCount++;
        console.log(`Updated [${student.name}] (${student.email})`);
      } else {
        notFoundCount++;
        console.warn(`Student NOT FOUND: ${item.name} <${item.email}>`);
      }
    }

    console.log(`\nDONE: Successfully updated ${updatedCount} students. ${notFoundCount} not found.`);
    process.exit(0);
  } catch (err) {
    console.error("Error updating parent data:", err);
    process.exit(1);
  }
}

updateParentData();
