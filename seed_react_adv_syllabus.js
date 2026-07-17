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
    chapterTitle: "Module 1: React Architecture & Best Practices (L1–L5)",
    chapterOrder: 1,
    lectures: [
      {
        title: "L1: React Revision + Folder Structure (Industry Standard)",
        duration: 60,
        order: 1,
        description: "Concepts: Clean project structure, Separation of concerns, Reusable components. Practical: Setup structured React app. Outcome: Student writes clean & scalable codebase.",
        subLectures: [
          { title: "Concept: Clean project structure", duration: 15, order: 0 },
          { title: "Concept: Separation of concerns", duration: 15, order: 1 },
          { title: "Concept: Reusable components", duration: 15, order: 2 },
          { title: "Practical: Setup structured React app", duration: 10, order: 3 },
          { title: "Outcome: Student writes clean & scalable codebase", duration: 5, order: 4 }
        ]
      },
      {
        title: "L2: Component Design Patterns",
        duration: 60,
        order: 2,
        description: "Concepts: Smart vs Dumb components, Reusable UI patterns. Practical: Convert messy UI into reusable components. Outcome: Think like frontend engineer.",
        subLectures: [
          { title: "Concept: Smart vs Dumb components", duration: 20, order: 0 },
          { title: "Concept: Reusable UI patterns", duration: 20, order: 1 },
          { title: "Practical: Convert messy UI into reusable components", duration: 15, order: 2 },
          { title: "Outcome: Think like frontend engineer", duration: 5, order: 3 }
        ]
      },
      {
        title: "L3: Props Drilling Problem",
        duration: 60,
        order: 3,
        description: "Concepts: Deep component communication issue. Practical: Identify real scenario. Outcome: Understand scaling issues.",
        subLectures: [
          { title: "Concept: Deep component communication issue", duration: 25, order: 0 },
          { title: "Practical: Identify real scenario", duration: 25, order: 1 },
          { title: "Outcome: Understand scaling issues", duration: 10, order: 2 }
        ]
      },
      {
        title: "L4: Context API (Solution)",
        duration: 60,
        order: 4,
        description: "Concepts: Global state management. Practical: Build theme system. Outcome: Handle app-level data.",
        subLectures: [
          { title: "Concept: Global state management", duration: 20, order: 0 },
          { title: "Practical: Build theme system", duration: 30, order: 1 },
          { title: "Outcome: Handle app-level data", duration: 10, order: 2 }
        ]
      },
      {
        title: "L5: Custom Hooks",
        duration: 60,
        order: 5,
        description: "Concepts: Logic reuse. Practical: Create useFetch hook. Outcome: Write reusable logic.",
        subLectures: [
          { title: "Concept: Logic reuse", duration: 20, order: 0 },
          { title: "Practical: Create useFetch hook", duration: 30, order: 1 },
          { title: "Outcome: Write reusable logic", duration: 10, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: State Management (L6–L10)",
    chapterOrder: 2,
    lectures: [
      {
        title: "L6: Advanced useState + useEffect",
        duration: 60,
        order: 6,
        description: "Concepts: Dependency optimization, Avoid infinite loops. Practical: Data fetching app. Outcome: Control rendering behavior.",
        subLectures: [
          { title: "Concept: Dependency optimization", duration: 20, order: 0 },
          { title: "Concept: Avoid infinite loops", duration: 20, order: 1 },
          { title: "Practical: Data fetching app", duration: 15, order: 2 },
          { title: "Outcome: Control rendering behavior", duration: 5, order: 3 }
        ]
      },
      {
        title: "L7: useReducer (Complex State)",
        duration: 60,
        order: 7,
        description: "Concepts: State transitions, Reducer logic. Practical: Build cart logic. Outcome: Manage complex UI states.",
        subLectures: [
          { title: "Concept: State transitions & Reducer logic", duration: 25, order: 0 },
          { title: "Practical: Build cart logic", duration: 25, order: 1 },
          { title: "Outcome: Manage complex UI states", duration: 10, order: 2 }
        ]
      },
      {
        title: "L8: Global State Strategy (Context + Reducer)",
        duration: 60,
        order: 8,
        description: "Practical: Combine Context & Reducer. Outcome: Build scalable state system.",
        subLectures: [
          { title: "Practical: Combine Context & Reducer", duration: 50, order: 0 },
          { title: "Outcome: Build scalable state system", duration: 10, order: 1 }
        ]
      },
      {
        title: "L9: Performance Optimization (Basics)",
        duration: 60,
        order: 9,
        description: "Concepts: Re-render issues. Practical: Debug slow UI. Outcome: Improve performance.",
        subLectures: [
          { title: "Concept: Re-render issues", duration: 20, order: 0 },
          { title: "Practical: Debug slow UI", duration: 30, order: 1 },
          { title: "Outcome: Improve performance", duration: 10, order: 2 }
        ]
      },
      {
        title: "L10: Memoization",
        duration: 60,
        order: 10,
        description: "Concepts: useMemo, useCallback, React.memo. Practical: Optimize component. Outcome: Prevent unnecessary renders.",
        subLectures: [
          { title: "Concept: useMemo, useCallback, React.memo", duration: 25, order: 0 },
          { title: "Practical: Optimize component", duration: 25, order: 1 },
          { title: "Outcome: Prevent unnecessary renders", duration: 10, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Routing & Navigation (L11–L14)",
    chapterOrder: 3,
    lectures: [
      {
        title: "L11: Advanced Routing",
        duration: 60,
        order: 11,
        description: "Concepts: Nested routes, Dynamic routes. Practical: Dashboard routing.",
        subLectures: [
          { title: "Concept: Nested routes & Dynamic routes", duration: 30, order: 0 },
          { title: "Practical: Dashboard routing", duration: 30, order: 1 }
        ]
      },
      {
        title: "L12: Protected Routes",
        duration: 60,
        order: 12,
        description: "Concepts: Auth-based navigation. Practical: Restrict dashboard.",
        subLectures: [
          { title: "Concept: Auth-based navigation", duration: 30, order: 0 },
          { title: "Practical: Restrict dashboard access", duration: 30, order: 1 }
        ]
      },
      {
        title: "L13: Layout System",
        duration: 60,
        order: 13,
        description: "Concepts: Shared layouts. Practical: Sidebar + Navbar.",
        subLectures: [
          { title: "Concept: Shared layouts", duration: 20, order: 0 },
          { title: "Practical: Implement Sidebar & Navbar", duration: 40, order: 1 }
        ]
      },
      {
        title: "L14: Error Handling Routes",
        duration: 60,
        order: 14,
        description: "Concepts: 404 pages.",
        subLectures: [
          { title: "Concept: 404 error page implementation", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: API & Data Handling (L15–L20)",
    chapterOrder: 4,
    lectures: [
      {
        title: "L15: API Integration (Real Backend)",
        duration: 60,
        order: 15,
        description: "Practical: Connect Node API.",
        subLectures: [
          { title: "Practical: Connect Node API backend", duration: 60, order: 0 }
        ]
      },
      {
        title: "L16: Loading + Error States",
        duration: 60,
        order: 16,
        description: "Concepts: UX handling.",
        subLectures: [
          { title: "Concept: UX loading & error state styling", duration: 60, order: 0 }
        ]
      },
      {
        title: "L17: Axios + Interceptors",
        duration: 60,
        order: 17,
        description: "Concepts: Request/response control.",
        subLectures: [
          { title: "Concept: Request & response interceptors", duration: 60, order: 0 }
        ]
      },
      {
        title: "L18: Token Handling",
        duration: 60,
        order: 18,
        description: "Concepts: JWT storage.",
        subLectures: [
          { title: "Concept: JWT secure browser storage", duration: 60, order: 0 }
        ]
      },
      {
        title: "L19: API Architecture",
        duration: 60,
        order: 19,
        description: "Concepts: Service layer.",
        subLectures: [
          { title: "Concept: Clean service layer setup", duration: 60, order: 0 }
        ]
      },
      {
        title: "L20: Data Caching Basics",
        duration: 60,
        order: 20,
        description: "Concepts: Avoid unnecessary API calls.",
        subLectures: [
          { title: "Concept: Caching strategies and state sync", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: Forms & Validation (L21–L24)",
    chapterOrder: 5,
    lectures: [
      {
        title: "L21: Controlled Forms",
        duration: 60,
        order: 21,
        description: "Concepts: Controlled inputs state.",
        subLectures: [
          { title: "Concept: Controlled forms architecture", duration: 60, order: 0 }
        ]
      },
      {
        title: "L22: Form Validation",
        duration: 60,
        order: 22,
        description: "Concepts: Client-side validation rules.",
        subLectures: [
          { title: "Concept: Form validation and validation feedback", duration: 60, order: 0 }
        ]
      },
      {
        title: "L23: Advanced Forms (Dynamic)",
        duration: 60,
        order: 23,
        description: "Concepts: Dynamic field arrays.",
        subLectures: [
          { title: "Concept: Adding and removing dynamic fields", duration: 60, order: 0 }
        ]
      },
      {
        title: "L24: Form UX Improvements",
        duration: 60,
        order: 24,
        description: "Concepts: Auto-focus, enter key, submission loader.",
        subLectures: [
          { title: "Concept: Form UX and focus tracking", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: UI Scaling (L25–L27)",
    chapterOrder: 6,
    lectures: [
      {
        title: "L25: Reusable UI Components",
        duration: 60,
        order: 25,
        description: "Concepts: Button, Input, Select custom components.",
        subLectures: [
          { title: "Concept: Custom atomic UI libraries", duration: 60, order: 0 }
        ]
      },
      {
        title: "L26: Modal, Toast, Loader Systems",
        duration: 60,
        order: 26,
        description: "Concepts: Modals, global toast notification triggers, loaders.",
        subLectures: [
          { title: "Concept: Setting up portals & global toasts", duration: 60, order: 0 }
        ]
      },
      {
        title: "L27: Theme System (Dark/Light)",
        duration: 60,
        order: 27,
        description: "Concepts: Dark/Light theme switching logic.",
        subLectures: [
          { title: "Concept: Local storage sync and CSS variables theme integration", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 7: Project Integration (L28–L30)",
    chapterOrder: 7,
    lectures: [
      {
        title: "L28: Mini Project (Dashboard UI)",
        duration: 60,
        order: 28,
        description: "Features: Sidebar, Routing, API.",
        subLectures: [
          { title: "Feature: Sidebar navigation UI", duration: 20, order: 0 },
          { title: "Feature: Routing dashboard subpages", duration: 20, order: 1 },
          { title: "Feature: Integrating layout APIs", duration: 20, order: 2 }
        ]
      },
      {
        title: "L29: Performance Optimization + Cleanup",
        duration: 60,
        order: 29,
        description: "Concepts: Component cleanup, listener removal, load time optimizations.",
        subLectures: [
          { title: "Concept: Cleanup hooks and leak prevention", duration: 60, order: 0 }
        ]
      },
      {
        title: "L30: Final Integration with Backend",
        duration: 60,
        order: 30,
        description: "Outcome: Fully functional frontend system.",
        subLectures: [
          { title: "Outcome: Live backend connection test", duration: 60, order: 0 }
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

    // 2. Find or create Syllabus document for "React Advanced"
    let syllabus = await Syllabus.findOne({ subject: "React Advanced" });
    if (syllabus) {
      console.log(`Existing React Advanced Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
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
      syllabus.name = "React Advanced";
      syllabus.description = "React Advanced - LECTURE WISE PLAN ( NIT )";
      syllabus.code = "REACT-ADV-NIT";
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("No existing React Advanced Syllabus found. Creating a new one...");
      syllabus = await Syllabus.create({
        subject: "React Advanced",
        name: "React Advanced",
        code: "REACT-ADV-NIT",
        description: "React Advanced - LECTURE WISE PLAN ( NIT )",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new React Advanced Syllabus (ID: ${syllabus._id}).`);
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
