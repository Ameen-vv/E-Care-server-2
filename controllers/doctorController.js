import doctorModel from "../model/doctorSchema.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import otpGenerator from "../otpGenerator/otpGenerator.js";
import { generateToken } from "../jwtAuth/generateJwt.js";
import sendMail from "../nodeMailer/nodeMailer.js";
import cloudinary from "../utils/cloudinary.js";
import departmentModel from "../model/departmentModel.js";
let verifyOtp;
import { checkSlots, getAppointmentCountDoctor } from "./helpers/helpers.js";
import appointmentModel from "../model/appointmentSchema.js";
import walletModel from "../model/walletSchema.js";
import walletTransactionModel from "../model/walletTransactionsSchem.js";

export const sendOtp = (req, res) => {
  try {
    let response = {};
    let email = req.body.doctorEmail;
    doctorModel.findOne({ email: email }).then((result) => {
      if (result) {
        response.userExist = true;
        res.status(200).json(response);
      } else {
        otpGenerator().then((otp) => {
          verifyOtp = otp;
          sendMail(email, otp).then((mail) => {
            if (mail.otpSent) {
              res.status(200).json(response);
            } else {
              res.status(500);
            }
          });
        });
      }
    });
  } catch (err) {
    res.status(500);
  }
};

export const doctorSignUp = (req, res) => {
  try {
    let response = {};
    let doctor = req.body.doctorData;
    const otp = req.body.otp;
    const image = req.body.imageData;
    if (otp === verifyOtp) {
      cloudinary.uploader
        .upload(image, { upload_preset: "Ecare" })
        .then((result) => {
          bcrypt.hash(doctor.password, 10).then((hash) => {
            doctor.password = hash;
            doctor.licenseUrl = result.secure_url;
            const newDoctor = new doctorModel(doctor);
            newDoctor.save().then(() => {
              response.signUp = true;
              res.status(200).json(response);
            });
          });
        });
    } else {
      res.status(200).json(response);
    }
  } catch (err) {
    res.status(500);
  }
};

export const docSignUpWoOtp = (req, res) => {
  try {
    let doctor = req.body.doctorData;
    doctorModel.findOne({ email: doctor.email }).then((result) => {
      if (result) {
        res
          .status(200)
          .json({ ok: false, message: "User already exists with this email" });
      } else {
        const image = req.body.imageData;
        cloudinary.uploader
          .upload(image, { upload_preset: "Ecare" })
          .then((result) => {
            bcrypt.hash(doctor.password, 10).then((hash) => {
              doctor.password = hash;
              doctor.licenseUrl = result.secure_url;
              const newDoctor = new doctorModel(doctor);
              newDoctor.save().then(() => {
                res
                  .status(200)
                  .json({ ok: true, message: "SignUp Successfull" });
              });
            });
          });
      }
    });
  } catch (err) {
    res.status(500);
  }
};

export const resendOtp = (req, res) => {
  try {
    let response = {};
    let email = req.body.email;
    otpGenerator().then((otp) => {
      verifyOtp = otp;
      sendMail(email, otp).then((result) => {
        if (result.otpSent) {
          response.otpSent = true;
          res.status(200).json(response);
        } else {
          res.status(500);
        }
      });
    });
  } catch (err) {
    res.status(500);
  }
};

export const SignIn = (req, res) => {
  try {
    const { email, password } = req.body;
    doctorModel.findOne({ email: email }).then((doctor) => {
      if (doctor) {
        if (!doctor.block) {
          bcrypt.compare(password, doctor.password, (err, result) => {
            if (result) {
              if (doctor.verification === "success") {
                const token = generateToken({
                  doctorId: doctor._id,
                  doctorName: doctor.fullName,
                  type: "doctor",
                });
                res
                  .status(200)
                  .json({ ok: true, message: "login success", token });
              } else if (doctor.verification === "pending") {
                res
                  .status(200)
                  .json({
                    ok: false,
                    message:
                      "Verification is pending please try after some time",
                  });
              } else {
                // response.status = "rejected";
                // response.id = doctor._id;
                res
                  .status(200)
                  .json({ ok: false, message: "Your profile was rejected" });
              }
            } else if (err) {
              res.status(500);
            } else {
              res
                .status(200)
                .json({ ok: false, message: "Incorrect password" });
            }
          });
        } else {
          res
            .status(200)
            .json({ ok: false, message: "You are blocked by admin" });
        }
      } else {
        res
          .status(200)
          .json({
            ok: false,
            message: "no user with this email please register",
          });
      }
    });
  } catch (err) {
    res.status(500);
  }
};

export const doctorAuth = (req, res) => {
  let token = req.headers.authorization;
  try {
    if (token) {
      jwt.verify(token, process.env.TOKEN_SECRET, (err, result) => {
        if (!err) {
          doctorModel.findOne({ _id: result.doctorId }).then((user) => {
            if (user) {
              if (!user.block) {
                res.status(200).json({ authorization: true });
              } else {
                res.status(401).json({ authorization: false });
              }
            } else {
              res.status(401).json({ authorization: false });
            }
          });
        } else {
          res.status(401).json({ authorization: false });
        }
      });
    } else {
      res.status(401).json({ authorization: false });
    }
  } catch (err) {
    res.status(500);
  }
};

export const rejectedUser = (req, res) => {
  try {
    let doctorId = req.params.id;
    let response = {};
    doctorModel.findOne({ _id: doctorId }).then((doctor) => {
      response.details = doctor?.rejectReason;
      response.status = true;
      res.status(200).json(response);
    });
  } catch (err) {
    res.status(500);
  }
};

export const resendApplication = (req, res) => {
  try {
    let doctorId = req.params.id;
    doctorModel
      .updateOne(
        { _id: doctorId },
        {
          $set: {
            verification: "pending",
          },
        }
      )
      .then((doctor) => {
        doctor.acknowledged
          ? res.status(200).json({ status: true })
          : res.status(200).json({ status: false });
      });
  } catch (err) {
    res.status(500);
  }
};

export const getDepartment = (req, res) => {
  try {
    departmentModel.find({}, "_id name").then((departments) => {
      res.status(200).json({ data: departments });
    });
  } catch (err) {
    res.status(500);
  }
};

export const getDocDetails = (req, res) => {
  try {
    doctorModel
      .findOne({ _id: req.doctorLogged })
      .populate("department")
      .then((doctor) => {
        res.status(200).json({data:doctor});
      });
  } catch (err) {
    res.status(500);
  }
};

export const editProfile = (req, res) => {
  try {
    let response = {};
    let details = req.body.doctorData;
    doctorModel
      .updateOne(
        { _id: req.doctorLogged },
        {
          $set: details,
        }
      )
      .then((update) => {
        update.acknowledged
          ? (response.status = true)
          : (response.status = false);
        res.status(200).json(response);
      });
  } catch (err) {
    res.status(500);
  }
};

export const timeSlots = (req, res) => {
  try {
    let slots = req.body.data;
    checkSlots(slots, req.doctorLogged).then((check) => {
      if (!check) {
        doctorModel
          .updateOne(
            { _id: req.doctorLogged },
            {
              $push: {
                timings: slots,
              },
            }
          )
          .then((update) => {
            update.acknowledged
            ? res.status(200).json({ok:true,message:'Time slot added'}) :
            res.status(200).json({ok:false,message:'something went wrong'})
          });
      } else {
        res.status(200).json({ok:false,message:'Slot already exists'});
      }
    });
  } catch (err) {
    res.status(500);
  }
};

export const deleteSlot = (req, res) => {
  try {
    const data = req.body.data;
    doctorModel
      .updateOne(
        { _id: req.doctorLogged },
        {
          $pull: {
            timings: data,
          },
        }
      )
      .then((result) => {
        result.acknowledged
          ? res.status(200).json({ok:true,message:'Slot deleted'})
          : res.status(200).json({ok:false,message:'Something went wrong'});
        
      });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
};

export const editProfilePic = (req, res) => {
  try {
    const image = req.body.imageData;
    cloudinary.uploader
      .upload(image, { upload_preset: "Ecare" })
      .then((imageData) => {
        doctorModel
          .updateOne(
            { _id: req.doctorLogged },
            {
              $set: {
                profilePic: imageData.secure_url,
              },
            }
          )
          .then((result) => {
            result.acknowledged
              ? res.status(200).json({ result: true })
              : res.status(500);
          });
      });
  } catch (err) {
    res.status(500);
  }
};

export const getAppointmentsDoctor = (req, res) => {
  try {
    const date = req.query.date ?? null;
    let query = {
      doctorId: req.doctorLogged,
      status: "booked",
      paymentStatus: true,
    };
    date && (query.date = date);
    appointmentModel
      .find(query)
      .populate("patientId", "fullName phone email _id")
      .then((appointments) => {
        res.status(200).json({data:appointments});
      });
  } catch (err) {
    res.status(500);
  }
};

export const appointmentVisited = (req, res) => {
  try {
    appointmentModel
      .updateOne(
        { _id: req.params.id },
        {
          $set: {
            status: "visited",
          },
        }
      )
      .then((update) => {
        update.acknowledged
          ? res.status(200).json({ ok: true })
          : res.status(200);
      });
  } catch (err) {
    res.status(500);
  }
};

export const appointmentUnVisited = (req, res) => {
  try {
    appointmentModel
      .updateOne(
        { _id: req.params.id },
        {
          $set: {
            status: "unVisited",
          },
        }
      )
      .then((update) => {
        update.acknowledged
          ? res.status(200).json({ ok: true })
          : res.status(200);
      });
  } catch (err) {
    res.status(500);
  }
};

export const cancelAppointment = (req, res) => {
  try {
    appointmentModel
      .findOne({ _id: req.params.id })
      .then((appointment) => {
        let transaction = new walletTransactionModel({
          amount: appointment.price,
          transactionType: "credit",
        });
        transaction.save().then((transaction) => {
          walletModel
            .updateOne(
              { userId: appointment.patientId },
              {
                $inc: {
                  balance: appointment.price,
                },
                $push: {
                  transactions: transaction._id,
                },
              }
            )
            .then(() => {
              appointmentModel
                .updateOne(
                  { _id: req.params.id },
                  {
                    $set: {
                      status: "cancelled",
                    },
                  }
                )
                .then((update) => {
                  update.acknowledged
                    ? res.status(200).json({ ok: true })
                    : res.status(200);
                });
            });
        });
      });
  } catch (err) {
    res.status(500);
  }
};

export const getDoctorDashboard = (req, res) => {
  try {
    let response = {};
    let appointmentGraph = [
      {
        name: "Appointments",
      },
    ];
    appointmentModel
      .count({ doctorId: req.doctorLogged, status: "visited" })
      .then((count) => {
        response.patientCount = count;
        appointmentModel
          .find({
            doctorId: req.doctorLogged,
            paymentStatus: true,
          })
          .then((appointments) => {
            let sum = 0;
            for (let i = 0; i < appointments.length; i++) {
              sum = sum + appointments[i].price;
            }
            response.totalRevenue = sum;
            appointmentModel
              .count({
                doctorId: req.doctorLogged,
                status: "booked",
              })
              .then((count) => {
                response.upcomingAppointments = count;
                getAppointmentCountDoctor(req.doctorLogged).then((count) => {
                  appointmentGraph[0].data = count;
                  response.appointmentGraph = appointmentGraph;
                  res.status(200).json(response);
                });
              });
          });
      });
  } catch (err) {
    res.status(500);
  }
};

export const getSalesDoctor = (req, res) => {
  try {
    appointmentModel
      .find({ doctorId: req.doctorLogged })
      .populate("patientId", "fullName email _id")
      .sort({ createdAt: -1 })
      .then((appointments) => {
        res.status(200).json(appointments);
      });
  } catch (err) {
    res.status(500);
  }
};
