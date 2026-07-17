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
    chapterTitle: "Module 1: Backend Architecture (L1–L5)",
    chapterOrder: 1,
    lectures: [
      {
        title: "L1: Backend Revision + Clean Architecture",
        duration: 60,
        order: 1,
        description: "Concepts: MVC vs Modular structure, Folder structuring (routes, controllers, services). Practical: Setup clean backend project. Outcome: Write scalable backend code.",
        subLectures: [
          { title: "Concept: MVC vs Modular structure", duration: 15, order: 0 },
          { title: "Concept: Folder structuring (routes, controllers, services)", duration: 15, order: 1 },
          { title: "Practical: Setup clean backend project", duration: 20, order: 2 },
          { title: "Outcome: Write scalable backend code", duration: 10, order: 3 }
        ]
      },
      {
        title: "L2: Layered Architecture",
        duration: 60,
        order: 2,
        description: "Concepts: Controller -> Service -> Repository. Practical: Refactor messy API. Outcome: Understand real world structure.",
        subLectures: [
          { title: "Concept: Controller -> Service -> Repository flow", duration: 20, order: 0 },
          { title: "Practical: Refactor messy API", duration: 30, order: 1 },
          { title: "Outcome: Understand real world structure", duration: 10, order: 2 }
        ]
      },
      {
        title: "L3: Environment Management",
        duration: 60,
        order: 3,
        description: "Concept: .env usage, Config handling. Practical: Secure keys. Outcome: Secure application setup.",
        subLectures: [
          { title: "Concept: .env usage & Config handling", duration: 25, order: 0 },
          { title: "Practical: Secure application keys", duration: 25, order: 1 },
          { title: "Outcome: Secure application setup", duration: 10, order: 2 }
        ]
      },
      {
        title: "L4: Error Handling System",
        duration: 60,
        order: 4,
        description: "Concept: Global error handler, Custom error classes. Practical: Handle API errors properly. Outcome: Professional error handling.",
        subLectures: [
          { title: "Concept: Global error handler & Custom error classes", duration: 25, order: 0 },
          { title: "Practical: Handle API errors properly", duration: 25, order: 1 },
          { title: "Outcome: Professional error handling", duration: 10, order: 2 }
        ]
      },
      {
        title: "L5: Logging System",
        duration: 60,
        order: 5,
        description: "Concept: Request logs, Debugging. Practical: Log middleware. Outcome: Debug like industry dev.",
        subLectures: [
          { title: "Concept: Request logs & Debugging", duration: 20, order: 0 },
          { title: "Practical: Write logging middleware", duration: 30, order: 1 },
          { title: "Outcome: Debug like industry dev", duration: 10, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: Authentication & Security (L6–L10)",
    chapterOrder: 2,
    lectures: [
      {
        title: "L6: Authentication Flow",
        duration: 60,
        order: 6,
        description: "Concept: Login system design.",
        subLectures: [
          { title: "Concept: Login system architecture and workflows", duration: 60, order: 0 }
        ]
      },
      {
        title: "L7: Password Hashing",
        duration: 60,
        order: 7,
        description: "Concepts: Secure password storage. Practical: Hash using bcrypt.",
        subLectures: [
          { title: "Concept: Secure password hashing standards", duration: 30, order: 0 },
          { title: "Practical: Hash passwords using bcrypt", duration: 30, order: 1 }
        ]
      },
      {
        title: "L8: JWT Authentication",
        duration: 60,
        order: 8,
        description: "Concepts: Token based auth. Practical: Login + token generation.",
        subLectures: [
          { title: "Concept: JWT structures and payloads", duration: 25, order: 0 },
          { title: "Practical: Implement user login and token generation", duration: 35, order: 1 }
        ]
      },
      {
        title: "L9: Middleware Security",
        duration: 60,
        order: 9,
        description: "Concepts: Auth middleware, Role-based access.",
        subLectures: [
          { title: "Concept: Authentication and role validation middleware", duration: 60, order: 0 }
        ]
      },
      {
        title: "L10: Security Best Practices",
        duration: 60,
        order: 10,
        description: "Concepts: CORS, Rate limiting, Basic protection.",
        subLectures: [
          { title: "Concept: CORS configurations", duration: 20, order: 0 },
          { title: "Concept: Express rate limiting setup", duration: 20, order: 1 },
          { title: "Concept: Helmet & Basic security protections", duration: 20, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Database Integration (L11–L15)",
    chapterOrder: 3,
    lectures: [
      {
        title: "L11: Advanced Mongo Integration",
        duration: 60,
        order: 11,
        description: "Concepts: Schema structuring.",
        subLectures: [
          { title: "Concept: Structural design of Mongo schemas", duration: 60, order: 0 }
        ]
      },
      {
        title: "L12: Relationships in Mongo",
        duration: 60,
        order: 12,
        description: "Concepts: Referencing vs embedding.",
        subLectures: [
          { title: "Concept: Comparing referencing vs embedding data models", duration: 60, order: 0 }
        ]
      },
      {
        title: "L13: Query Optimization",
        duration: 60,
        order: 13,
        description: "Concepts: Efficient queries.",
        subLectures: [
          { title: "Concept: Query profiling, index generation and analytics", duration: 60, order: 0 }
        ]
      },
      {
        title: "L14: Pagination + Filtering",
        duration: 60,
        order: 14,
        description: "Practical: API with filters.",
        subLectures: [
          { title: "Practical: Setup skip/limit pagination and queries with filters", duration: 60, order: 0 }
        ]
      },
      {
        title: "L15: Data Validation",
        duration: 60,
        order: 15,
        description: "Concepts: Request validation.",
        subLectures: [
          { title: "Concept: Joi/Zod schema validations", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: API Design (L16–L20)",
    chapterOrder: 4,
    lectures: [
      {
        title: "L16: REST API Best Practices",
        duration: 60,
        order: 16,
        description: "Concept: Proper endpoints.",
        subLectures: [
          { title: "Concept: REST resource naming guidelines", duration: 60, order: 0 }
        ]
      },
      {
        title: "L17: API Versioning",
        duration: 60,
        order: 17,
        description: "Concepts: URL and Header versioning formats.",
        subLectures: [
          { title: "Concept: Versioning strategies (v1 vs v2)", duration: 60, order: 0 }
        ]
      },
      {
        title: "L18: Response Standardization",
        duration: 60,
        order: 18,
        description: "Concept: Consistent responses.",
        subLectures: [
          { title: "Concept: Standard JSON layouts for success and errors", duration: 60, order: 0 }
        ]
      },
      {
        title: "L19: File Upload System",
        duration: 60,
        order: 19,
        description: "Practical: Upload images/files.",
        subLectures: [
          { title: "Practical: File uploads using Multer", duration: 60, order: 0 }
        ]
      },
      {
        title: "L20: Third-party API Integration",
        duration: 60,
        order: 20,
        description: "Practical: External API use.",
        subLectures: [
          { title: "Practical: Integrating payment gateways or notification hubs", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: Performance & Scalability (L21–L25)",
    chapterOrder: 5,
    lectures: [
      {
        title: "L21: Caching Basics",
        duration: 60,
        order: 21,
        description: "Concepts: Reduce DB load.",
        subLectures: [
          { title: "Concept: In-memory database caching using Redis", duration: 60, order: 0 }
        ]
      },
      {
        title: "L22: Async Handling",
        duration: 60,
        order: 22,
        description: "Concepts: Async/await optimization.",
        subLectures: [
          { title: "Concept: Async call overheads and multi-promise routing", duration: 60, order: 0 }
        ]
      },
      {
        title: "L23: Rate Limiting",
        duration: 60,
        order: 23,
        description: "Concepts: DDoS mitigation and request limits.",
        subLectures: [
          { title: "Concept: Implement express-rate-limit controls", duration: 60, order: 0 }
        ]
      },
      {
        title: "L24: Background Jobs (Intro)",
        duration: 60,
        order: 24,
        description: "Concepts: Queue basics.",
        subLectures: [
          { title: "Concept: Setting up background worker pools (BullMQ / Agenda)", duration: 60, order: 0 }
        ]
      },
      {
        title: "L25: Code Optimization",
        duration: 60,
        order: 25,
        description: "Concepts: Memory leaks, payload sizing.",
        subLectures: [
          { title: "Concept: Profiling express applications and cleaning memory", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: Testing & Debugging (L26–L27)",
    chapterOrder: 6,
    lectures: [
      {
        title: "L26: API Testing",
        duration: 60,
        order: 26,
        description: "Tools: Postman.",
        subLectures: [
          { title: "Tool: Automated Postman integrations and test suites", duration: 60, order: 0 }
        ]
      },
      {
        title: "L27: Debugging Techniques",
        duration: 60,
        order: 27,
        description: "Concepts: Inspector panel, node debugging logs.",
        subLectures: [
          { title: "Concept: Breakpoints and inspector execution states", duration: 60, order: 0 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 7: Project Integration (L28–L30)",
    chapterOrder: 7,
    lectures: [
      {
        title: "L28: Build Auth System (End-to-End)",
        duration: 60,
        order: 28,
        description: "Features: Signup, Login, Token.",
        subLectures: [
          { title: "Feature: Signup endpoint", duration: 20, order: 0 },
          { title: "Feature: Secure login logic", duration: 20, order: 1 },
          { title: "Feature: JWT session generation", duration: 20, order: 2 }
        ]
      },
      {
        title: "L29: Build Complete Backend API",
        duration: 60,
        order: 29,
        description: "Features: CRUD, Auth, Validation.",
        subLectures: [
          { title: "Feature: CRUD resources", duration: 20, order: 0 },
          { title: "Feature: Auth integration middleware", duration: 20, order: 1 },
          { title: "Feature: Request payload schema validations", duration: 20, order: 2 }
        ]
      },
      {
        title: "L30: Connect with Frontend",
        duration: 60,
        order: 30,
        description: "Outcome: Full-stack working system.",
        subLectures: [
          { title: "Outcome: Full-stack working system test", duration: 60, order: 0 }
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

    // 2. Find or create Syllabus document for "Backend Advanced"
    let syllabus = await Syllabus.findOne({ subject: "Backend Advanced" });
    if (syllabus) {
      console.log(`Existing Backend Advanced Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
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
      syllabus.name = "Backend Advanced";
      syllabus.description = "Backend Advanced - LECTURE WISE PLAN ( NIT )";
      syllabus.code = "BACKEND-ADV-NIT";
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("No existing Backend Advanced Syllabus found. Creating a new one...");
      syllabus = await Syllabus.create({
        subject: "Backend Advanced",
        name: "Backend Advanced",
        code: "BACKEND-ADV-NIT",
        description: "Backend Advanced - LECTURE WISE PLAN ( NIT )",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new Backend Advanced Syllabus (ID: ${syllabus._id}).`);
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
