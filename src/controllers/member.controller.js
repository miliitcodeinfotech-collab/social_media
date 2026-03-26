import { Member } from "../models/member.model.js";

const createMember = async (req, res) => {
    try {
        const {
            firstname,
            lastname,
            mobile,
            email,
            countryCode,
        } = req.body;

        if (!firstname || !lastname || !mobile) {
            return res.status(400).json({
                success: false,
                message: "Firstname, lastname, and mobile are required fields",
            });
        }

        // Check if member already exists
        const existingMember = await Member.findOne({ mobile });
        if (existingMember) {
            return res.status(409).json({
                success: false,
                message: "A member with this mobile number already exists",
            });
        }

        const newMember = new Member({
            firstname,
            lastname,
            mobile,
            email: email || "",
            countryCode: countryCode || "+91",
        });

        const savedMember = await newMember.save();

        return res.status(201).json({
            success: true,
            message: "Member created successfully",
            data: savedMember
        });

    } catch (error) {
        console.error("Error creating member: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while creating member",
            error: error.message
        });
    }
};

const getAllMembers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { isDeleted: false };

        const [members, totalMembers] = await Promise.all([
            Member.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Member.countDocuments(query)
        ]);
        
        const totalPages = Math.ceil(totalMembers / limit);

        return res.status(200).json({
            success: true,
            message: "Members fetched successfully",
            count: members.length,
            pagination: {
                totalMembers,
                totalPages,
                currentPage: page,
                limit
            },
            data: members
        });
    } catch (error) {
        console.error("Error fetching members: ", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching members",
            error: error.message
        });
    }
};

const getMemberById = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await Member.findOne({ _id: id, isDeleted: false });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Member fetched successfully",
            data: member
        });
    } catch (error) {
        console.error("Error fetching single member: ", error);
        if (error.kind === "ObjectId") {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID format"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching the member",
            error: error.message
        });
    }
};

export {
    createMember,
    getAllMembers,
    getMemberById
};
