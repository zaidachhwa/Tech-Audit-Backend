import mongoose from "mongoose";
import dotenv from "dotenv";
import { Syllabus } from "./models/syllabus.model.js";
import { Chapter } from "./models/chapter.model.js";
import { Lecture } from "./models/lecture.model.js";
import { Admin } from "./models/admin.model.js";
import { BatchSyllabus } from "./models/batchSyllabus.model.js";
import { BatchLecture } from "./models/batchLecture.model.js";

dotenv.config({ path: "./.env" });

const syllabusData = [
  {
    chapterTitle: "Module 1: CSS Core + Debugging (L1–L6)",
    chapterOrder: 1,
    lectures: [
      {
        title: "L1: How CSS Works Internally",
        duration: 60,
        order: 1,
        description: "Concepts: CSSOM + DOM -> Render Tree, Why styles conflict, Browser rendering basics. Outcome: Student understands why CSS breaks.",
        subLectures: [
          { title: "Concept: CSSOM + DOM -> Render Tree", duration: 20, order: 0 },
          { title: "Concept: Why styles conflict", duration: 20, order: 1 },
          { title: "Concept: Browser rendering basics", duration: 15, order: 2 },
          { title: "Outcome: Student understands why CSS breaks", duration: 5, order: 3 }
        ]
      },
      {
        title: "L2: Selectors + Syntax",
        duration: 60,
        order: 2,
        description: "Concepts: Class, ID, element, Grouping selectors.",
        subLectures: [
          { title: "Concept: Class, ID, element", duration: 30, order: 0 },
          { title: "Concept: Grouping selectors", duration: 30, order: 1 }
        ]
      },
      {
        title: "L3: Specificity (CRITICAL)",
        duration: 60,
        order: 3,
        description: "Concepts: Specificity hierarchy, Inline vs external, !important misuse. Outcome: Student can fix CSS conflicts (industry skill).",
        subLectures: [
          { title: "Concept: Specificity hierarchy", duration: 20, order: 0 },
          { title: "Concept: Inline vs external", duration: 20, order: 1 },
          { title: "Concept: !important misuse", duration: 15, order: 2 },
          { title: "Outcome: Student can fix CSS conflicts (industry skill)", duration: 5, order: 3 }
        ]
      },
      {
        title: "L4: Units + Typography",
        duration: 60,
        order: 4,
        description: "Concepts: px vs rem vs em, font systems.",
        subLectures: [
          { title: "Concept: px vs rem vs em", duration: 30, order: 0 },
          { title: "Concept: font systems", duration: 30, order: 1 }
        ]
      },
      {
        title: "L5–L6: DevTools Mastery",
        duration: 120,
        order: 5,
        description: "Hands-on: Inspect layout, Fix spacing issues. Outcome: Debugging confidence.",
        subLectures: [
          { title: "Hands-on: Inspect layout", duration: 50, order: 0 },
          { title: "Hands-on: Fix spacing issues", duration: 50, order: 1 },
          { title: "Outcome: Debugging confidence", duration: 20, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: Layout Systems (L7–L16)",
    chapterOrder: 2,
    lectures: [
      {
        title: "L7: Box Model Deep Dive",
        duration: 60,
        order: 7,
        description: "Concepts: margin, padding, border, box-sizing.",
        subLectures: [
          { title: "Concept: margin, padding, border", duration: 30, order: 0 },
          { title: "Concept: box-sizing", duration: 30, order: 1 }
        ]
      },
      {
        title: "L8–L9: Display & Positioning",
        duration: 120,
        order: 8,
        description: "Concepts: block vs inline, relative, absolute, fixed.",
        subLectures: [
          { title: "Concept: block vs inline", duration: 60, order: 0 },
          { title: "Concept: relative, absolute, fixed", duration: 60, order: 1 }
        ]
      },
      {
        title: "L10–L13: Flexbox (MOST IMPORTANT)",
        duration: 240,
        order: 10,
        description: "Concepts: flex container, alignment (justify, align), real layouts. Hands-on: Build Navbar, Card layout. Outcome: Student can build most layouts using Flexbox.",
        subLectures: [
          { title: "Concept: flex container", duration: 40, order: 0 },
          { title: "Concept: alignment (justify, align)", duration: 40, order: 1 },
          { title: "Concept: real layouts", duration: 40, order: 2 },
          { title: "Build: Navbar", duration: 60, order: 3 },
          { title: "Build: Card layout", duration: 50, order: 4 },
          { title: "Outcome: Student can build most layouts using Flexbox", duration: 10, order: 5 }
        ]
      },
      {
        title: "L14–L16: CSS Grid",
        duration: 180,
        order: 14,
        description: "Concepts: rows, columns, grid template, responsive grid. Hands-on: Dashboard layout.",
        subLectures: [
          { title: "Concept: rows, columns", duration: 40, order: 0 },
          { title: "Concept: grid template", duration: 40, order: 1 },
          { title: "Concept: responsive grid", duration: 40, order: 2 },
          { title: "Hands-on: Dashboard layout", duration: 60, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Responsive Design (L17–L22)",
    chapterOrder: 3,
    lectures: [
      {
        title: "L17: Mobile-First Approach",
        duration: 60,
        order: 17,
        description: "Concepts: Why mobile-first.",
        subLectures: [
          { title: "Concept: Why mobile-first", duration: 60, order: 0 }
        ]
      },
      {
        title: "L18–L19: Media Queries",
        duration: 120,
        order: 18,
        description: "Concepts: breakpoints, device handling.",
        subLectures: [
          { title: "Concept: breakpoints", duration: 60, order: 0 },
          { title: "Concept: device handling", duration: 60, order: 1 }
        ]
      },
      {
        title: "L20–L21: Responsive UI Building",
        duration: 120,
        order: 20,
        description: "Hands-on: Convert desktop -> mobile layout.",
        subLectures: [
          { title: "Hands-on: Convert desktop -> mobile layout", duration: 120, order: 0 }
        ]
      },
      {
        title: "L22: Project",
        duration: 60,
        order: 22,
        description: "Build: Responsive Landing Page. Outcome: Real responsive understanding.",
        subLectures: [
          { title: "Build: Responsive Landing Page", duration: 50, order: 0 },
          { title: "Outcome: Real responsive understanding", duration: 10, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: Advanced CSS (L23–L26)",
    chapterOrder: 4,
    lectures: [
      {
        title: "L23: Pseudo Classes & Elements",
        duration: 60,
        order: 23,
        description: "Concepts: :hover, :focus, :before, :after.",
        subLectures: [
          { title: "Concept: :hover, :focus", duration: 30, order: 0 },
          { title: "Concept: :before, :after", duration: 30, order: 1 }
        ]
      },
      {
        title: "L24: Transitions & Animations",
        duration: 60,
        order: 24,
        description: "Concepts: transition, keyframes.",
        subLectures: [
          { title: "Concept: transition", duration: 30, order: 0 },
          { title: "Concept: keyframes", duration: 30, order: 1 }
        ]
      },
      {
        title: "L25: CSS Variables",
        duration: 60,
        order: 25,
        description: "Concepts: reusable styling.",
        subLectures: [
          { title: "Concept: reusable styling", duration: 60, order: 0 }
        ]
      },
      {
        title: "L26: Modern UI Styling",
        duration: 60,
        order: 26,
        description: "Concepts: shadows, gradients, glassmorphism (intro).",
        subLectures: [
          { title: "Concept: shadows", duration: 20, order: 0 },
          { title: "Concept: gradients", duration: 20, order: 1 },
          { title: "Concept: glassmorphism (intro)", duration: 20, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: Tailwind CSS (L27–L32)",
    chapterOrder: 5,
    lectures: [
      {
        title: "L27: Why Tailwind (Industry Context)",
        duration: 60,
        order: 27,
        description: "Concepts: utility-first CSS, pros/cons.",
        subLectures: [
          { title: "Concept: utility-first CSS", duration: 30, order: 0 },
          { title: "Concept: pros/cons", duration: 30, order: 1 }
        ]
      },
      {
        title: "L28: Setup Tailwind",
        duration: 60,
        order: 28,
        description: "Concepts: CDN vs CLI, project integration.",
        subLectures: [
          { title: "Concept: CDN vs CLI", duration: 30, order: 0 },
          { title: "Concept: project integration", duration: 30, order: 1 }
        ]
      },
      {
        title: "L29–L30: Core Tailwind",
        duration: 120,
        order: 29,
        description: "Concepts: spacing, flex/grid, typography.",
        subLectures: [
          { title: "Concept: spacing", duration: 40, order: 0 },
          { title: "Concept: flex/grid", duration: 40, order: 1 },
          { title: "Concept: typography", duration: 40, order: 2 }
        ]
      },
      {
        title: "L31: Responsive Tailwind",
        duration: 60,
        order: 31,
        description: "Concepts: breakpoints, mobile-first utilities.",
        subLectures: [
          { title: "Concept: breakpoints", duration: 30, order: 0 },
          { title: "Concept: mobile-first utilities", duration: 30, order: 1 }
        ]
      },
      {
        title: "L32: Component Building",
        duration: 60,
        order: 32,
        description: "Build: Buttons, Cards, Navbar.",
        subLectures: [
          { title: "Build: Buttons", duration: 20, order: 0 },
          { title: "Build: Cards", duration: 20, order: 1 },
          { title: "Build: Navbar", duration: 20, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: Real UI Projects (L33–L38)",
    chapterOrder: 6,
    lectures: [
      {
        title: "L33–L35: Project 1",
        duration: 180,
        order: 33,
        description: "Build: Startup Landing Page. Includes: Hero section, Features, Footer.",
        subLectures: [
          { title: "Build: Startup Landing Page", duration: 90, order: 0 },
          { title: "Includes: Hero section", duration: 30, order: 1 },
          { title: "Includes: Features", duration: 30, order: 2 },
          { title: "Includes: Footer", duration: 30, order: 3 }
        ]
      },
      {
        title: "L36–L38: Project 2",
        duration: 180,
        order: 36,
        description: "Build: Dashboard UI. Includes: Sidebar, Cards, Table.",
        subLectures: [
          { title: "Build: Dashboard UI", duration: 90, order: 0 },
          { title: "Includes: Sidebar", duration: 30, order: 1 },
          { title: "Includes: Cards", duration: 30, order: 2 },
          { title: "Includes: Table", duration: 30, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 7: Optimization + Evaluation (L39–L40)",
    chapterOrder: 7,
    lectures: [
      {
        title: "L39: Performance & Best Practices",
        duration: 60,
        order: 39,
        description: "Concepts: clean CSS, avoiding redundancy.",
        subLectures: [
          { title: "Concept: clean CSS", duration: 30, order: 0 },
          { title: "Concept: avoiding redundancy", duration: 30, order: 1 }
        ]
      },
      {
        title: "L40: Final Evaluation",
        duration: 60,
        order: 40,
        description: "Includes: UI Challenge, Live building.",
        subLectures: [
          { title: "Includes: UI Challenge", duration: 30, order: 0 },
          { title: "Includes: Live building", duration: 30, order: 1 }
        ]
      }
    ]
  }
];

async function seed() {
  try {
    console.log("Connecting to MONGODB...");
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to database successfully.");

    // 1. Get default admin to assign as creator
    const admin = await Admin.findOne({});
    if (!admin) {
      throw new Error("No Admin user found in the database. Please create an Admin first.");
    }
    console.log(`Using Admin "${admin.name}" (ID: ${admin._id}) as creator.`);

    // 2. Find or create Syllabus document for "CSS"
    let syllabus = await Syllabus.findOne({ subject: "CSS" });
    if (syllabus) {
      console.log(`Existing CSS Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
      // Clear associated chapters & lectures
      const deletedChapters = await Chapter.deleteMany({ subjectId: syllabus._id });
      console.log(`Deleted ${deletedChapters.deletedCount} old chapters.`);
      
      const deletedLectures = await Lecture.deleteMany({ syllabus: syllabus._id });
      console.log(`Deleted ${deletedLectures.deletedCount} old template lectures.`);

      // Also clean up any BatchLectures for this syllabus (keep BatchSyllabus mapping intact)
      const deletedBatchLectures = await BatchLecture.deleteMany({ syllabus: syllabus._id });
      console.log(`Deleted ${deletedBatchLectures.deletedCount} old batch-specific lectures.`);

      // Reset the syllabus arrays
      syllabus.lectures = [];
      syllabus.topics = [];
      syllabus.name = "CSS";
      syllabus.description = "CSS - LECTURE WISE PLAN ( NIT )";
      syllabus.code = "CSS-NIT";
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("No existing CSS Syllabus found. Creating a new one...");
      syllabus = await Syllabus.create({
        subject: "CSS",
        name: "CSS",
        code: "CSS-NIT",
        description: "CSS - LECTURE WISE PLAN ( NIT )",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new CSS Syllabus (ID: ${syllabus._id}).`);
    }

    const createdLectureIds = [];

    // 3. Loop through and create Chapters & Lectures
    for (const chapterData of syllabusData) {
      console.log(`Creating Chapter: "${chapterData.chapterTitle}"...`);
      const chapter = await Chapter.create({
        subjectId: syllabus._id,
        title: chapterData.chapterTitle,
        order: chapterData.chapterOrder
      });

      console.log(`Creating lectures for chapter: "${chapter.title}"...`);
      for (const lectureData of chapterData.lectures) {
        const lecture = await Lecture.create({
          syllabus: syllabus._id,
          title: lectureData.title,
          description: lectureData.description || "",
          chapterId: chapter._id.toString(),
          duration: lectureData.duration || 60,
          lectureType: "Normal",
          order: lectureData.order,
          completionStatus: "Pending",
          subLectures: (lectureData.subLectures || []).map((sl) => ({
            title: sl.title,
            duration: sl.duration || 0,
            order: sl.order,
            completionStatus: "Pending"
          }))
        });

        createdLectureIds.push(lecture._id);
        console.log(` - Created Lecture: "${lecture.title}" (ID: ${lecture._id})`);
      }
    }

    // 4. Update the Syllabus document to include all created lectures/topics
    syllabus.lectures = createdLectureIds;
    syllabus.topics = createdLectureIds; // sync topics (alias v2 compatibility)
    await syllabus.save();
    console.log("Updated Syllabus document with all new lectures.");

    // 5. Propagate to active batches if any BatchSyllabus exists
    const activeBatchSyllabi = await BatchSyllabus.find({ syllabus: syllabus._id });
    console.log(`Found ${activeBatchSyllabi.length} active batch assignments for this syllabus.`);
    
    if (activeBatchSyllabi.length > 0) {
      console.log("Propagating new lectures to active batches...");
      const templateLectures = await Lecture.find({ syllabus: syllabus._id });
      
      let propagatedCount = 0;
      for (const bs of activeBatchSyllabi) {
        const batchLectureDocs = templateLectures.map((lecture) => ({
          batch: bs.batch,
          syllabus: syllabus._id,
          templateLecture: lecture._id,
          title: lecture.title,
          description: lecture.description,
          chapterId: lecture.chapterId,
          duration: lecture.duration,
          lectureType: lecture.lectureType,
          order: lecture.order,
          completionStatus: "Pending",
          subLectures: lecture.subLectures.map(sl => ({
            title: sl.title,
            duration: sl.duration,
            order: sl.order,
            completionStatus: "Pending"
          }))
        }));
        const inserted = await BatchLecture.insertMany(batchLectureDocs);
        propagatedCount += inserted.length;
      }
      console.log(`Propagated ${propagatedCount} lectures across ${activeBatchSyllabi.length} batches.`);
    }

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed with error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MONGODB.");
  }
}

seed();
