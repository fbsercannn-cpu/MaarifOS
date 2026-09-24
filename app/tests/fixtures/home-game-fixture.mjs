import { makeDevelopmentReportFixture } from "./development-report-fixture.mjs";
import { createPlanWithActivity } from "../../src/features/evidence/evidence-flow.ts";
import { curriculumTargetsForProfile } from "../../src/features/curriculum/curriculum-catalog.ts";
export async function homeGameFixture(store) {
 const f=await makeDevelopmentReportFixture(store), snapshot=await f.store.readSnapshot();
 const profile=snapshot.classrooms[0].curriculumProfileSnapshot;
 const source=await createPlanWithActivity(f.store,{civilDate:"2026-09-10",planTitle:"Kurgu hikâye planı",activityTitle:"Evde hikâye sıralama",startTime:"10:00",curriculumProfile:profile,curriculumTargets:[curriculumTargetsForProfile(profile,"60-72")[0]],assignmentMode:"whole-class",studentIds:[],now:new Date("2026-09-10T06:00:00.000Z")});
 return {...f,source,scope:{academicYearId:f.input.academicYearId,classroomId:f.input.classroomId}};
}
