import express from "express";
import {
  SignIn,
  doctorSignUp,
  doctorAuth,
  sendOtp,
  resendOtp,
  rejectedUser,
  resendApplication,
  getDepartment,
  getDocDetails,
  editProfile,
  timeSlots,
  deleteSlot,
  editProfilePic,
  getAppointmentsDoctor,
  appointmentUnVisited,
  appointmentVisited,
  cancelAppointment,
  getDoctorDashboard,
  getSalesDoctor,
  docSignUpWoOtp,
} from "../controllers/doctorController.js";
import { doctorAuthentication } from "../middlewares/Authentications.js";
const router = express.Router();

router.post("/getOtp", sendOtp);
router.post("/signUp", docSignUpWoOtp);
router.post("/signIn", SignIn);
router.post("/resendOtp", resendOtp);
router.get("/authenticate", doctorAuth);
router.get("/rejectedUser/:id", rejectedUser);
router.get("/resendForm/:id", resendApplication);
router.get("/getDepartments", getDepartment);
router.get("/getDocDetails", doctorAuthentication, getDocDetails);
router.post("/editProfile", doctorAuthentication, editProfile);
router.post("/editTime", doctorAuthentication, timeSlots);
router.post("/deleteSlot", doctorAuthentication, deleteSlot);
router.post("/editProfilePic", doctorAuthentication, editProfilePic);
router.get("/getAppointments", doctorAuthentication, getAppointmentsDoctor);
router.get("/visitedAppointment/:id", doctorAuthentication, appointmentVisited);
router.get("/UnVisitedAppointment/:id", doctorAuthentication, appointmentUnVisited);
router.get("/cancelAppointment/:id", doctorAuthentication, cancelAppointment);
router.get("/getDashboardDetails", doctorAuthentication, getDoctorDashboard);
router.get("/getSales", doctorAuthentication, getSalesDoctor);

export default router;
