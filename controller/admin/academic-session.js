const AcademicSession = require('../../model/academic-session');

exports.manageSessions = async (req, res) => {
    try {
        if (req.user.role !== 'super-admin') {
            return res.status(403).send("Unauthorized");
        }
        const sessions = await AcademicSession.find().sort({ createdAt: -1 });
        res.render('admin/manage-sessions', { user: req.user, sessions, currentPath: '/admin/manage-sessions' });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};

exports.createSession = async (req, res) => {
    try {
        if (req.user.role !== 'super-admin') {
            return res.status(403).send("Unauthorized");
        }
        const { name } = req.body;
        const newSession = new AcademicSession({ name, isActive: true });
        await newSession.save();
        res.status(201).json(newSession);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to create session" });
    }
};

exports.deleteSession = async (req, res) => {
    try {
        if (req.user.role !== 'super-admin') {
            return res.status(403).send("Unauthorized");
        }
        await AcademicSession.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete session" });
    }
};
