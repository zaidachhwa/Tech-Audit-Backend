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
    chapterTitle: "Module 1: Foundations (L1–L12)",
    chapterOrder: 1,
    lectures: [
      {
        title: "L1: How JavaScript Works Internally",
        duration: 60,
        order: 1,
        description: "Concepts: JS Engine (V8 concept), Execution context, Call stack. Outcome: Student understands JS internal working.",
        subLectures: [
          { title: "Concept: JS Engine (V8 concept)", duration: 20, order: 0 },
          { title: "Concept: Execution context", duration: 20, order: 1 },
          { title: "Concept: Call stack", duration: 15, order: 2 },
          { title: "Outcome: Student understands JS internal working", duration: 5, order: 3 }
        ]
      },
      {
        title: "L2: Variables & Data Types",
        duration: 60,
        order: 2,
        description: "Concepts: let, const, var, primitive vs reference.",
        subLectures: [
          { title: "Concept: let, const, var", duration: 30, order: 0 },
          { title: "Concept: primitive vs reference", duration: 30, order: 1 }
        ]
      },
      {
        title: "L3: Type Conversion & Operators",
        duration: 60,
        order: 3,
        description: "Concepts: == vs ===, coercion.",
        subLectures: [
          { title: "Concept: == vs ===", duration: 30, order: 0 },
          { title: "Concept: coercion", duration: 30, order: 1 }
        ]
      },
      {
        title: "L4–L5: Conditionals",
        duration: 120,
        order: 4,
        description: "Concepts: if, else, switch, real-world decision logic.",
        subLectures: [
          { title: "Concept: if, else, switch", duration: 60, order: 0 },
          { title: "Concept: real-world decision logic", duration: 60, order: 1 }
        ]
      },
      {
        title: "L6–L8: Loops + Problem Solving",
        duration: 180,
        order: 6,
        description: "Concepts: for, while, nested loops. Practice: patterns, number problems. Outcome: Strong logic foundation.",
        subLectures: [
          { title: "Concept: for, while", duration: 40, order: 0 },
          { title: "Concept: nested loops", duration: 40, order: 1 },
          { title: "Practice: patterns", duration: 50, order: 2 },
          { title: "Practice: number problems", duration: 40, order: 3 },
          { title: "Outcome: Strong logic foundation", duration: 10, order: 4 }
        ]
      },
      {
        title: "L9–L10: Functions Basics",
        duration: 120,
        order: 9,
        description: "Concepts: declaration vs expression, parameters.",
        subLectures: [
          { title: "Concept: declaration vs expression", duration: 60, order: 0 },
          { title: "Concept: parameters", duration: 60, order: 1 }
        ]
      },
      {
        title: "L11–L12: First Logic Practice",
        duration: 120,
        order: 11,
        description: "Build: Calculator, Small logic programs.",
        subLectures: [
          { title: "Build: Calculator", duration: 60, order: 0 },
          { title: "Build: Small logic programs", duration: 60, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: Functions & Deep JS (L13–L22)",
    chapterOrder: 2,
    lectures: [
      {
        title: "L13–L14: Arrow Functions + Callbacks",
        duration: 120,
        order: 13,
        description: "Concepts: Arrow functions syntax and callback basics.",
        subLectures: [
          { title: "Concept: Arrow functions syntax", duration: 60, order: 0 },
          { title: "Concept: Callback functions basics", duration: 60, order: 1 }
        ]
      },
      {
        title: "L15–L16: Scope & Closures (VERY IMPORTANT)",
        duration: 120,
        order: 15,
        description: "Concepts: lexical scope, closure. Outcome: Interview-level understanding.",
        subLectures: [
          { title: "Concept: lexical scope", duration: 50, order: 0 },
          { title: "Concept: closure", duration: 50, order: 1 },
          { title: "Outcome: Interview-level understanding", duration: 20, order: 2 }
        ]
      },
      {
        title: "L17–L18: this Keyword",
        duration: 120,
        order: 17,
        description: "Concepts: Global/Implicit/Explicit binding of this keyword.",
        subLectures: [
          { title: "Concept: Global & implicit binding", duration: 60, order: 0 },
          { title: "Concept: Explicit binding (call, apply, bind)", duration: 60, order: 1 }
        ]
      },
      {
        title: "L19–L20: Hoisting + Execution Context",
        duration: 120,
        order: 19,
        description: "Concepts: Hoisting mechanics, Phase breakdown.",
        subLectures: [
          { title: "Concept: Hoisting mechanics", duration: 60, order: 0 },
          { title: "Concept: Execution phase breakdown", duration: 60, order: 1 }
        ]
      },
      {
        title: "L21–L22: Practice + Debugging",
        duration: 120,
        order: 21,
        description: "Focus: tricky JS behavior.",
        subLectures: [
          { title: "Focus: tricky JS behavior", duration: 120, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Arrays & Objects (L23–L28)",
    chapterOrder: 3,
    lectures: [
      {
        title: "L23–L24: Arrays Advanced",
        duration: 120,
        order: 23,
        description: "Concepts: map, filter, reduce.",
        subLectures: [
          { title: "Concept: map, filter, reduce", duration: 120, order: 0 }
        ]
      },
      {
        title: "L25–L26: Objects",
        duration: 120,
        order: 25,
        description: "Concepts: real-world data modeling.",
        subLectures: [
          { title: "Concept: real-world data modeling", duration: 120, order: 0 }
        ]
      },
      {
        title: "L27–L28: Mini Project",
        duration: 120,
        order: 27,
        description: "Build: Expense Tracker.",
        subLectures: [
          { title: "Build: Expense Tracker", duration: 120, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: DOM & Events (L29–L40)",
    chapterOrder: 4,
    lectures: [
      {
        title: "L29–L30: DOM Basics",
        duration: 120,
        order: 29,
        description: "Concepts: selecting elements, document object.",
        subLectures: [
          { title: "Concept: selecting elements", duration: 60, order: 0 },
          { title: "Concept: document object", duration: 60, order: 1 }
        ]
      },
      {
        title: "L31–L32: Events",
        duration: 120,
        order: 31,
        description: "Concepts: click, input, submit.",
        subLectures: [
          { title: "Concept: click, input, submit", duration: 120, order: 0 }
        ]
      },
      {
        title: "L33–L34: DOM Manipulation",
        duration: 120,
        order: 33,
        description: "Concepts: create/update/delete elements.",
        subLectures: [
          { title: "Concept: create/update/delete elements", duration: 120, order: 0 }
        ]
      },
      {
        title: "L35–L36: Forms Handling",
        duration: 120,
        order: 35,
        description: "Concepts: validation logic.",
        subLectures: [
          { title: "Concept: validation logic", duration: 120, order: 0 }
        ]
      },
      {
        title: "L37–L38: Event Delegation",
        duration: 120,
        order: 37,
        description: "Concepts: bubbling vs capturing.",
        subLectures: [
          { title: "Concept: bubbling vs capturing", duration: 120, order: 0 }
        ]
      },
      {
        title: "L39–L40: Project",
        duration: 120,
        order: 39,
        description: "Build: To-Do App.",
        subLectures: [
          { title: "Build: To-Do App", duration: 120, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: Async JS + APIs (L41–L52)",
    chapterOrder: 5,
    lectures: [
      {
        title: "L41: Sync vs Async",
        duration: 60,
        order: 41,
        description: "Concepts: Sync vs Async execution.",
        subLectures: [
          { title: "Concept: Sync vs Async execution", duration: 60, order: 0 }
        ]
      },
      {
        title: "L42–L43: Callbacks",
        duration: 120,
        order: 42,
        description: "Concepts: Callback hell, Asynchronous callbacks.",
        subLectures: [
          { title: "Concept: Callback hell", duration: 60, order: 0 },
          { title: "Concept: Asynchronous callbacks", duration: 60, order: 1 }
        ]
      },
      {
        title: "L44–L46: Promises",
        duration: 180,
        order: 44,
        description: "Concepts: Resolve, Reject, Promise chaining.",
        subLectures: [
          { title: "Concept: Resolve vs Reject", duration: 90, order: 0 },
          { title: "Concept: Promise chaining", duration: 90, order: 1 }
        ]
      },
      {
        title: "L47–L49: async/await",
        duration: 180,
        order: 47,
        description: "Outcome: Student handles real async flows.",
        subLectures: [
          { title: "Outcome: Student handles real async flows", duration: 180, order: 0 }
        ]
      },
      {
        title: "L50–L51: Fetch API",
        duration: 120,
        order: 50,
        description: "Concepts: GET/POST, JSON.",
        subLectures: [
          { title: "Concept: GET/POST", duration: 60, order: 0 },
          { title: "Concept: JSON", duration: 60, order: 1 }
        ]
      },
      {
        title: "L52: Project",
        duration: 60,
        order: 52,
        description: "Build: Weather App (API based).",
        subLectures: [
          { title: "Build: Weather App (API based)", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: Advanced JS (L53–L60)",
    chapterOrder: 6,
    lectures: [
      {
        title: "L53–L54: ES6+ Features",
        duration: 120,
        order: 53,
        description: "Concepts: destructuring, spread/rest.",
        subLectures: [
          { title: "Concept: destructuring", duration: 60, order: 0 },
          { title: "Concept: spread/rest", duration: 60, order: 1 }
        ]
      },
      {
        title: "L55–L56: Modules",
        duration: 120,
        order: 55,
        description: "Concepts: import/export. Focus: React preparation.",
        subLectures: [
          { title: "Concept: import/export", duration: 60, order: 0 },
          { title: "Focus: React preparation", duration: 60, order: 1 }
        ]
      },
      {
        title: "L57–L58: Error Handling",
        duration: 120,
        order: 57,
        description: "Concepts: try/catch.",
        subLectures: [
          { title: "Concept: try/catch", duration: 120, order: 0 }
        ]
      },
      {
        title: "L59–L60: Performance Basics",
        duration: 120,
        order: 59,
        description: "Concepts: optimization, memory awareness.",
        subLectures: [
          { title: "Concept: optimization", duration: 60, order: 0 },
          { title: "Concept: memory awareness", duration: 60, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 7: Projects (L61–L68)",
    chapterOrder: 7,
    lectures: [
      {
        title: "L61–L64: Project 1",
        duration: 240,
        order: 61,
        description: "Build: Quiz App.",
        subLectures: [
          { title: "Build: Quiz App", duration: 240, order: 0 }
        ]
      },
      {
        title: "L65–L67: Project 2",
        duration: 180,
        order: 65,
        description: "Build: Notes App (local storage).",
        subLectures: [
          { title: "Build: Notes App (local storage)", duration: 180, order: 0 }
        ]
      },
      {
        title: "L68: Code Review",
        duration: 60,
        order: 68,
        description: "Focus: Peer review and structure optimization.",
        subLectures: [
          { title: "Focus: Peer review & code refactoring", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 8: Evaluation (L69–L70)",
    chapterOrder: 8,
    lectures: [
      {
        title: "L69: Debugging + Interview Questions",
        duration: 60,
        order: 69,
        description: "Focus: Common coding pitfalls and theoretical questions.",
        subLectures: [
          { title: "Focus: Interview preparation", duration: 60, order: 0 }
        ]
      },
      {
        title: "L70: Final Assessment",
        duration: 60,
        order: 70,
        description: "Focus: Live coding + logic test.",
        subLectures: [
          { title: "Focus: Live coding + logic test", duration: 60, order: 0 }
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

    // 2. Find or create Syllabus document for "JavaScript"
    let syllabus = await Syllabus.findOne({ subject: "JavaScript" });
    if (syllabus) {
      console.log(`Existing JavaScript Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
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
      syllabus.name = "JavaScript";
      syllabus.description = "JavaScript - LECTURE WISE PLAN ( NIT )";
      syllabus.code = "JS-NIT";
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("No existing JavaScript Syllabus found. Creating a new one...");
      syllabus = await Syllabus.create({
        subject: "JavaScript",
        name: "JavaScript",
        code: "JS-NIT",
        description: "JavaScript - LECTURE WISE PLAN ( NIT )",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new JavaScript Syllabus (ID: ${syllabus._id}).`);
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
