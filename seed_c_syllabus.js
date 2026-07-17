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
        title: "L1: How C Works Internally",
        duration: 60,
        order: 1,
        description: "Concepts: Compilation process, Memory concept (RAM basics), Why C is powerful. Outcome: Student understands low-level behavior.",
        subLectures: [
          { title: "Concept: Compilation process", duration: 20, order: 0 },
          { title: "Concept: Memory concept (RAM basics)", duration: 20, order: 1 },
          { title: "Concept: Why C is powerful", duration: 15, order: 2 },
          { title: "Outcome: Student understands low-level behavior", duration: 5, order: 3 }
        ]
      },
      {
        title: "L2–L3: Structure of C Program",
        duration: 120,
        order: 2,
        description: "Concepts: main(), syntax, compilation.",
        subLectures: [
          { title: "Concept: main()", duration: 40, order: 0 },
          { title: "Concept: syntax", duration: 40, order: 1 },
          { title: "Concept: compilation", duration: 40, order: 2 }
        ]
      },
      {
        title: "L4–L5: Variables & Data Types",
        duration: 120,
        order: 4,
        description: "Concepts: int, float, char, memory allocation basics.",
        subLectures: [
          { title: "Concept: int, float, char", duration: 60, order: 0 },
          { title: "Concept: memory allocation basics", duration: 60, order: 1 }
        ]
      },
      {
        title: "L6: Input/Output",
        duration: 60,
        order: 6,
        description: "Concepts: scanf, printf, formatting.",
        subLectures: [
          { title: "Concept: scanf, printf", duration: 30, order: 0 },
          { title: "Concept: formatting", duration: 30, order: 1 }
        ]
      },
      {
        title: "L7–L8: Operators",
        duration: 120,
        order: 7,
        description: "Concepts: arithmetic, relational, logical.",
        subLectures: [
          { title: "Concept: arithmetic, relational, logical", duration: 120, order: 0 }
        ]
      },
      {
        title: "L9–L12: Problem Solving",
        duration: 240,
        order: 9,
        description: "Programs: basic calculator, unit conversions, simple logic building.",
        subLectures: [
          { title: "Build: basic calculator", duration: 80, order: 0 },
          { title: "Build: unit conversions", duration: 80, order: 1 },
          { title: "Build: simple logic building", duration: 80, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: Control Flow (L13–L22)",
    chapterOrder: 2,
    lectures: [
      {
        title: "L13–L15: Conditionals",
        duration: 180,
        order: 13,
        description: "Concepts: if, else, nested if.",
        subLectures: [
          { title: "Concept: if, else, nested if", duration: 180, order: 0 }
        ]
      },
      {
        title: "L16–L18: Switch Case",
        duration: 180,
        order: 16,
        description: "Concepts: real-world usage.",
        subLectures: [
          { title: "Concept: real-world usage", duration: 180, order: 0 }
        ]
      },
      {
        title: "L19–L22: Loops (VERY IMPORTANT)",
        duration: 240,
        order: 19,
        description: "Concepts: for, while, do-while, nested loops. Practice: patterns, number problems. Outcome: Strong loop mastery (placement base).",
        subLectures: [
          { title: "Concept: for, while, do-while", duration: 60, order: 0 },
          { title: "Concept: nested loops", duration: 60, order: 1 },
          { title: "Practice: patterns", duration: 60, order: 2 },
          { title: "Practice: number problems", duration: 50, order: 3 },
          { title: "Outcome: Strong loop mastery (placement base)", duration: 10, order: 4 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Functions & Arrays (L23–L32)",
    chapterOrder: 3,
    lectures: [
      {
        title: "L23–L25: Functions",
        duration: 180,
        order: 23,
        description: "Concepts: declaration vs definition, parameters, return values.",
        subLectures: [
          { title: "Concept: declaration vs definition", duration: 60, order: 0 },
          { title: "Concept: parameters", duration: 60, order: 1 },
          { title: "Concept: return values", duration: 60, order: 2 }
        ]
      },
      {
        title: "L26–L28: Arrays (1D)",
        duration: 180,
        order: 26,
        description: "Concepts: traversal, searching.",
        subLectures: [
          { title: "Concept: traversal", duration: 90, order: 0 },
          { title: "Concept: searching", duration: 90, order: 1 }
        ]
      },
      {
        title: "L29–L30: 2D Arrays",
        duration: 120,
        order: 29,
        description: "Concepts: matrix problems.",
        subLectures: [
          { title: "Concept: matrix problems", duration: 120, order: 0 }
        ]
      },
      {
        title: "L31–L32: Mini Project",
        duration: 120,
        order: 31,
        description: "Build: Marksheet system, Student record logic.",
        subLectures: [
          { title: "Build: Marksheet system", duration: 60, order: 0 },
          { title: "Build: Student record logic", duration: 60, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: Pointers (Core Strength) (L33–L45)",
    chapterOrder: 4,
    lectures: [
      {
        title: "L33–L35: Pointer Basics",
        duration: 180,
        order: 33,
        description: "Concepts: address, dereferencing.",
        subLectures: [
          { title: "Concept: address", duration: 90, order: 0 },
          { title: "Concept: dereferencing", duration: 90, order: 1 }
        ]
      },
      {
        title: "L36–L38: Pointer Arithmetic",
        duration: 180,
        order: 36,
        description: "Concepts: memory traversal.",
        subLectures: [
          { title: "Concept: memory traversal", duration: 180, order: 0 }
        ]
      },
      {
        title: "L39–L41: Arrays & Pointers",
        duration: 180,
        order: 39,
        description: "Concepts: deep connection.",
        subLectures: [
          { title: "Concept: deep connection", duration: 180, order: 0 }
        ]
      },
      {
        title: "L42–L43: Functions with Pointers",
        duration: 120,
        order: 42,
        description: "Concepts: call by reference.",
        subLectures: [
          { title: "Concept: call by reference", duration: 120, order: 0 }
        ]
      },
      {
        title: "L44–L45: Advanced Pointer Problems",
        duration: 120,
        order: 44,
        description: "Concepts: Swap, dynamic behavior. Outcome: Student understands memory-level programming (rare skill).",
        subLectures: [
          { title: "Concept: Swap & dynamic behavior", duration: 100, order: 0 },
          { title: "Outcome: Student understands memory-level programming (rare skill)", duration: 20, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: File Handling & Advanced (L46–L55)",
    chapterOrder: 5,
    lectures: [
      {
        title: "L46–L48: File Handling",
        duration: 180,
        order: 46,
        description: "Concepts: fopen, fread, fwrite.",
        subLectures: [
          { title: "Concept: fopen, fread, fwrite", duration: 180, order: 0 }
        ]
      },
      {
        title: "L49–L50: Structures",
        duration: 120,
        order: 49,
        description: "Concepts: struct basics, real data modeling.",
        subLectures: [
          { title: "Concept: struct basics", duration: 60, order: 0 },
          { title: "Concept: real data modeling", duration: 60, order: 1 }
        ]
      },
      {
        title: "L51–L52: Dynamic Memory (Intro)",
        duration: 120,
        order: 51,
        description: "Concepts: malloc, free.",
        subLectures: [
          { title: "Concept: malloc, free", duration: 120, order: 0 }
        ]
      },
      {
        title: "L53–L55: Mini Project",
        duration: 180,
        order: 53,
        description: "Build: File-based login system, Student database.",
        subLectures: [
          { title: "Build: File-based login system", duration: 90, order: 0 },
          { title: "Build: Student database", duration: 90, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: Practice + Placement Prep (L56–L60)",
    chapterOrder: 6,
    lectures: [
      {
        title: "L56–L57: Problem Solving",
        duration: 120,
        order: 56,
        description: "Concepts: number problems, logic building.",
        subLectures: [
          { title: "Concept: number problems", duration: 60, order: 0 },
          { title: "Concept: logic building", duration: 60, order: 1 }
        ]
      },
      {
        title: "L58: Debugging Skills",
        duration: 60,
        order: 58,
        description: "Concepts: finding logical errors, memory issues.",
        subLectures: [
          { title: "Concept: finding logical errors", duration: 30, order: 0 },
          { title: "Concept: memory issues", duration: 30, order: 1 }
        ]
      },
      {
        title: "L59: Interview Questions",
        duration: 60,
        order: 59,
        description: "Concepts: pointers, arrays, tricky logic.",
        subLectures: [
          { title: "Concept: pointers, arrays", duration: 30, order: 0 },
          { title: "Concept: tricky logic", duration: 30, order: 1 }
        ]
      },
      {
        title: "L60: Final Evaluation",
        duration: 60,
        order: 60,
        description: "Concepts: coding test, viva.",
        subLectures: [
          { title: "Concept: coding test", duration: 30, order: 0 },
          { title: "Concept: viva", duration: 30, order: 1 }
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

    // 2. Find or create Syllabus document for "C Programming"
    let syllabus = await Syllabus.findOne({ subject: "C Programming" });
    if (syllabus) {
      console.log(`Existing C Programming Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
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
      syllabus.name = "C Programming";
      syllabus.description = "C Programming - LECTURE WISE PLAN ( NIT )";
      syllabus.code = "C-NIT";
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("No existing C Programming Syllabus found. Creating a new one...");
      syllabus = await Syllabus.create({
        subject: "C Programming",
        name: "C Programming",
        code: "C-NIT",
        description: "C Programming - LECTURE WISE PLAN ( NIT )",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new C Programming Syllabus (ID: ${syllabus._id}).`);
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
