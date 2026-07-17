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
    chapterTitle: "Module 1: React Foundations (L1–L6)",
    chapterOrder: 1,
    lectures: [
      {
        title: "L1: Why React + How It Works",
        duration: 60,
        order: 1,
        description: "Concepts: Problems with vanilla JS apps, Component-based architecture, Virtual DOM (conceptual). Outcome: Student understands why React is used in industry.",
        subLectures: [
          { title: "Concept: Problems with vanilla JS apps", duration: 20, order: 0 },
          { title: "Concept: Component-based architecture", duration: 20, order: 1 },
          { title: "Concept: Virtual DOM (conceptual)", duration: 15, order: 2 },
          { title: "Outcome: Student understands why React is used in industry", duration: 5, order: 3 }
        ]
      },
      {
        title: "L2: Environment Setup",
        duration: 60,
        order: 2,
        description: "Concepts: Vite / Create React App, Project structure.",
        subLectures: [
          { title: "Concept: Vite / Create React App", duration: 30, order: 0 },
          { title: "Concept: Project structure", duration: 30, order: 1 }
        ]
      },
      {
        title: "L3: JSX (Core Syntax)",
        duration: 60,
        order: 3,
        description: "Concepts: HTML inside JS, dynamic rendering.",
        subLectures: [
          { title: "Concept: HTML inside JS", duration: 30, order: 0 },
          { title: "Concept: dynamic rendering", duration: 30, order: 1 }
        ]
      },
      {
        title: "L4: Components (VERY IMPORTANT)",
        duration: 60,
        order: 4,
        description: "Concepts: functional components, reusable UI.",
        subLectures: [
          { title: "Concept: functional components", duration: 30, order: 0 },
          { title: "Concept: reusable UI", duration: 30, order: 1 }
        ]
      },
      {
        title: "L5: Props (Data Passing)",
        duration: 60,
        order: 5,
        description: "Concepts: passing data, reusable design.",
        subLectures: [
          { title: "Concept: passing data", duration: 30, order: 0 },
          { title: "Concept: reusable design", duration: 30, order: 1 }
        ]
      },
      {
        title: "L6: Mini Practice",
        duration: 60,
        order: 6,
        description: "Build: simple UI using components.",
        subLectures: [
          { title: "Build: simple UI using components", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: Components & State (L7–L14)",
    chapterOrder: 2,
    lectures: [
      {
        title: "L7–L8: State (CORE CONCEPT)",
        duration: 120,
        order: 7,
        description: "Concepts: useState, re-rendering. Outcome: Student understands dynamic UI.",
        subLectures: [
          { title: "Concept: useState hook", duration: 50, order: 0 },
          { title: "Concept: re-rendering", duration: 50, order: 1 },
          { title: "Outcome: Student understands dynamic UI", duration: 20, order: 2 }
        ]
      },
      {
        title: "L9–L10: Event Handling",
        duration: 120,
        order: 9,
        description: "Concepts: click events, input handling.",
        subLectures: [
          { title: "Concept: click events", duration: 60, order: 0 },
          { title: "Concept: input handling", duration: 60, order: 1 }
        ]
      },
      {
        title: "L11–L12: Conditional Rendering",
        duration: 120,
        order: 11,
        description: "Concepts: if, ternary, UI changes.",
        subLectures: [
          { title: "Concept: if & ternary conditional operators", duration: 60, order: 0 },
          { title: "Concept: UI state changes", duration: 60, order: 1 }
        ]
      },
      {
        title: "L13–L14: Lists & Keys",
        duration: 120,
        order: 13,
        description: "Concepts: rendering arrays, unique keys.",
        subLectures: [
          { title: "Concept: rendering arrays", duration: 60, order: 0 },
          { title: "Concept: unique keys in lists", duration: 60, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Hooks & Logic (L15–L20)",
    chapterOrder: 3,
    lectures: [
      {
        title: "L15–L16: useEffect (VERY IMPORTANT)",
        duration: 120,
        order: 15,
        description: "Concepts: lifecycle basics, side effects.",
        subLectures: [
          { title: "Concept: lifecycle basics", duration: 60, order: 0 },
          { title: "Concept: side effects in React", duration: 60, order: 1 }
        ]
      },
      {
        title: "L17–L18: Forms in React",
        duration: 120,
        order: 17,
        description: "Concepts: controlled components, form handling.",
        subLectures: [
          { title: "Concept: controlled components", duration: 60, order: 0 },
          { title: "Concept: form submission and validation", duration: 60, order: 1 }
        ]
      },
      {
        title: "L19–L20: Custom Hooks (Intro)",
        duration: 120,
        order: 19,
        description: "Concepts: reusable logic.",
        subLectures: [
          { title: "Concept: reusable logic through custom hooks", duration: 120, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: Routing & UI (L21–L25)",
    chapterOrder: 4,
    lectures: [
      {
        title: "L21–L22: React Router",
        duration: 120,
        order: 21,
        description: "Concepts: routes, navigation.",
        subLectures: [
          { title: "Concept: configuring routes", duration: 60, order: 0 },
          { title: "Concept: navigation & links", duration: 60, order: 1 }
        ]
      },
      {
        title: "L23–L24: Layout Structure",
        duration: 120,
        order: 23,
        description: "Build: Navbar, Page Layouts.",
        subLectures: [
          { title: "Build: Navbar component", duration: 60, order: 0 },
          { title: "Build: Page layouts and placeholders", duration: 60, order: 1 }
        ]
      },
      {
        title: "L25: UI Integration",
        duration: 60,
        order: 25,
        description: "Use: Tailwind CSS.",
        subLectures: [
          { title: "Use: Tailwind CSS in React projects", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: API Integration (L26–L30)",
    chapterOrder: 5,
    lectures: [
      {
        title: "L26–L27: Fetching Data",
        duration: 120,
        order: 26,
        description: "Concepts: API calls in React.",
        subLectures: [
          { title: "Concept: API calls in React using Fetch/Axios", duration: 120, order: 0 }
        ]
      },
      {
        title: "L28–L29: Handling Data",
        duration: 120,
        order: 28,
        description: "Concepts: loading states, error handling.",
        subLectures: [
          { title: "Concept: loading states implementation", duration: 60, order: 0 },
          { title: "Concept: error handling and fallbacks", duration: 60, order: 1 }
        ]
      },
      {
        title: "L30: Project",
        duration: 60,
        order: 30,
        description: "Build: API based app (e.g., product list / weather UI).",
        subLectures: [
          { title: "Build: API based app (e.g., product list / weather UI)", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: Advanced Concepts (L31–L34)",
    chapterOrder: 6,
    lectures: [
      {
        title: "L31: Lifting State Up",
        duration: 60,
        order: 31,
        description: "Concepts: shared state.",
        subLectures: [
          { title: "Concept: shared state between siblings", duration: 60, order: 0 }
        ]
      },
      {
        title: "L32: Context API (Intro)",
        duration: 60,
        order: 32,
        description: "Concepts: global state.",
        subLectures: [
          { title: "Concept: global state management via Context", duration: 60, order: 0 }
        ]
      },
      {
        title: "L33: Performance Basics",
        duration: 60,
        order: 33,
        description: "Concepts: re-render optimization.",
        subLectures: [
          { title: "Concept: re-render optimization basics", duration: 60, order: 0 }
        ]
      },
      {
        title: "L34: Clean Code Structure",
        duration: 60,
        order: 34,
        description: "Concepts: folder structure, scalability.",
        subLectures: [
          { title: "Concept: folder structure best practices", duration: 30, order: 0 },
          { title: "Concept: scalability of codebases", duration: 30, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 7: Projects (L35–L38)",
    chapterOrder: 7,
    lectures: [
      {
        title: "L35–L36: Project 1",
        duration: 120,
        order: 35,
        description: "Build: Notes App.",
        subLectures: [
          { title: "Build: Notes App", duration: 120, order: 0 }
        ]
      },
      {
        title: "L37–L38: Project 2",
        duration: 120,
        order: 37,
        description: "Build: Dashboard / Task Manager.",
        subLectures: [
          { title: "Build: Dashboard / Task Manager", duration: 120, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 8: Evaluation (L39–L40)",
    chapterOrder: 8,
    lectures: [
      {
        title: "L39: Debugging + Interview Questions",
        duration: 60,
        order: 39,
        description: "Focus: Common React bugs, DevTools, conceptual interview Qs.",
        subLectures: [
          { title: "Focus: Debugging and interview preparation", duration: 60, order: 0 }
        ]
      },
      {
        title: "L40: Final Assessment",
        duration: 60,
        order: 40,
        description: "Focus: Build UI + logic live.",
        subLectures: [
          { title: "Focus: Live build assessment", duration: 60, order: 0 }
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

    // 2. Find or create Syllabus document for "React"
    let syllabus = await Syllabus.findOne({ subject: "React" });
    if (syllabus) {
      console.log(`Existing React Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
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
      syllabus.name = "React";
      syllabus.description = "React - LECTURE WISE PLAN ( NIT )";
      syllabus.code = "REACT-NIT";
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("No existing React Syllabus found. Creating a new one...");
      syllabus = await Syllabus.create({
        subject: "React",
        name: "React",
        code: "REACT-NIT",
        description: "React - LECTURE WISE PLAN ( NIT )",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new React Syllabus (ID: ${syllabus._id}).`);
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
