const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const ExpressErrors = require("../utils/ExpressErrors.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../CloudConfig.js");
const upload = multer({ storage });

// const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
// const maptoken = process.env.MAP_TOKEN;
// const geocodingClient = mbxGeocoding({ accessToken: maptoken });     

//validate schema
const validateSchema = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        console.log(error)
        let errMsg = error.detail.map((el) => el.message).join(',');
        throw new ExpressErrors(404, errMsg);
    } else {
        next();
    }
}

// Index route
router.get("/", wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
}));

// New route
router.get("/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

// Create Route
router.post("/", isLoggedIn, upload.single("listing[image][url]"),wrapAsync(async (req, res, next) => {    
    let url = req.file.path;
    let filename = req.file.filename;
    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {url, filename};

    //   newListing.geometry =  response.body.features[0].geometry;

    await newListing.save();
    req.flash("success", "New listing Created!");
    res.redirect("/listings");
}));



// Edit route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        return res.status(404).send('Listing not found');
    }
    res.render("listings/edit.ejs", { listing });
}));

// Update route
router.put("/:id", isLoggedIn, isOwner, upload.single("listing[image][url]"), wrapAsync(async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

    if(typeof req.file !== "undefined"){
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = {url, filename};
    await listing.save();
    }

    req.flash("success", "listing Updated Successfully!");
    res.redirect(`/listings/${id}`);
}));

// Delete route
router.delete("/:id", isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    let { id } = req.params;

    // Validate ObjectId
    // if (!mongoose.Types.ObjectId.isValid(id)) {
    //     return res.status(400).send('Invalid ID format');
    // }

    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted Successfully!");
    res.redirect("/listings");
}));

// Show route
router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
    .populate({
        path: "reviews",
        populate: {
            path: "author",
        },
    })
    .populate("owner");
    if (!listing) {
        req.flash("error", "Requested listing does not exist!");
        res.redirect("/listings");
    }
    res.render("listings/show.ejs", { listing });
}));

module.exports = router;