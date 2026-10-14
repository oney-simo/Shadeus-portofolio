// ==========================================
// 1. SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL =
    "https://pyymldyloylmnpbkrisz.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_AyYbHpJOydwD4rfOPLknJQ_swz3iVUa";

const CV_BUCKET = "Cv files";
const CV_FILE_PATH = "my-cv.pdf";

const ADMIN_UID = "1810e7ca-d444-4a97-a74f-e81071201c4c";

const MAX_CV_SIZE = 5 * 1024 * 1024;

if (!window.supabase) {
    throw new Error(
        "Supabase library failed to load. Check your script tags."
    );
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==========================================
// 2. NAVIGATION MENU
// ==========================================

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navLinks.classList.toggle("open");

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation" : "Open navigation"
        );
    });

    navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("open");

            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation");
        });
    });
}


// ==========================================
// 3. SCROLL REVEAL ANIMATIONS
// ==========================================

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.12,
            rootMargin: "0px 0px -35px 0px"
        }
    );

    revealItems.forEach((item) => {
        revealObserver.observe(item);
    });
} else {
    revealItems.forEach((item) => {
        item.classList.add("is-visible");
    });
}


// ==========================================
// 4. ACTIVE NAVIGATION SECTION
// ==========================================

const sections = document.querySelectorAll("main section[id]");
const navAnchors = document.querySelectorAll(
    '.nav-links a[href^="#"]'
);

if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    navAnchors.forEach((anchor) => {
                        anchor.classList.toggle(
                            "active",
                            anchor.getAttribute("href") ===
                                `#${entry.target.id}`
                        );
                    });
                }
            });
        },
        {
            rootMargin: "-35% 0px -55% 0px"
        }
    );

    sections.forEach((section) => {
        sectionObserver.observe(section);
    });
}


// ==========================================
// 5. FOOTER YEAR
// ==========================================

const year = document.querySelector("#year");

if (year) {
    year.textContent = new Date().getFullYear();
}


// ==========================================
// 6. CV MANAGER ELEMENTS
// ==========================================

const manageCvBtn = document.getElementById("manageCvBtn");
const cvManagerPanel = document.getElementById("cvManagerPanel");

const cvPasswordForm = document.getElementById("cvPasswordForm");
const cvPassword = document.getElementById("cvPassword");

const cvActions = document.getElementById("cvActions");
const cvMessage = document.getElementById("cvMessage");

const uploadCvForm = document.getElementById("uploadCvForm");
const cvFile = document.getElementById("cvFile");

const deleteCvBtn = document.getElementById("deleteCvBtn");
const viewCvBtn = document.getElementById("viewCvBtn");


// ==========================================
// 7. DISPLAY CV STATUS MESSAGES
// ==========================================

function showCvMessage(message, isError = false) {
    if (!cvMessage) return;

    cvMessage.textContent = message;

    cvMessage.style.color = isError ? "red" : "inherit";
}


// ==========================================
// 8. CHECK ADMIN SESSION
// ==========================================

async function getAdminSession() {
    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    const user = data.session?.user;

    if (!user || user.id !== ADMIN_UID) {
        return null;
    }

    return data.session;
}


// ==========================================
// 9. GENERATE A SIGNED CV VIEWING URL
// ==========================================

async function getCvUrl() {
    const { data, error } = await supabaseClient
        .storage
        .from(CV_BUCKET)
        .createSignedUrl(CV_FILE_PATH, 3600);

    if (error) {
        throw error;
    }

    return data.signedUrl;
}


// ==========================================
// 10. PUBLIC CV VIEWING
// ==========================================

async function openCv() {
    showCvMessage("Preparing your CV...");

    // Open a tab immediately to reduce popup-blocking issues.
    const newTab = window.open("about:blank", "_blank");

    try {
        const signedUrl = await getCvUrl();

        if (newTab) {
            newTab.location.href = signedUrl;
        } else {
            // Fallback if the browser blocks the new tab.
            window.location.href = signedUrl;
        }

        showCvMessage("");
    } catch (error) {
        if (newTab) {
            newTab.close();
        }

        showCvMessage(
            "Unable to open the CV: " + error.message,
            true
        );
    }
}

if (viewCvBtn) {
    viewCvBtn.addEventListener("click", (event) => {
        event.preventDefault();
        openCv();
    });
}


// ==========================================
// 11. SHOW OR HIDE CV MANAGEMENT
// ==========================================

if (manageCvBtn && cvManagerPanel) {
    manageCvBtn.addEventListener("click", () => {
        cvManagerPanel.hidden = !cvManagerPanel.hidden;
    });
}


// ==========================================
// 12. ADMIN LOGIN
// ==========================================

if (cvPasswordForm && cvPassword) {
    cvPasswordForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            if (cvActions) {
                cvActions.hidden = true;
            }

            showCvMessage("Signing in...");

            // Ask for the email associated with your admin account.
            const adminEmail = prompt(
                "Enter your Supabase admin email:"
            );

            if (!adminEmail || !adminEmail.trim()) {
                showCvMessage("Admin email is required.", true);
                return;
            }

            const password = cvPassword.value;

            try {
                const { data, error } =
                    await supabaseClient.auth.signInWithPassword({
                        email: adminEmail.trim(),
                        password: password
                    });

                if (error) {
                    throw error;
                }

                if (
                    !data.user ||
                    data.user.id !== ADMIN_UID
                ) {
                    await supabaseClient.auth.signOut();

                    throw new Error(
                        "This account is not authorized to manage the CV."
                    );
                }

                if (cvActions) {
                    cvActions.hidden = false;
                }

                showCvMessage(
                    "Login successful. You can now manage your CV."
                );

                cvPassword.value = "";
            } catch (error) {
                showCvMessage(
                    "Login error: " + error.message,
                    true
                );
            }
        }
    );
}


// ==========================================
// 13. UPLOAD OR REPLACE CV
// ==========================================

if (uploadCvForm && cvFile) {
    uploadCvForm.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            const file = cvFile.files[0];

            if (!file) {
                showCvMessage(
                    "Please select your CV PDF.",
                    true
                );
                return;
            }

            if (
                file.type !== "application/pdf" ||
                !file.name.toLowerCase().endsWith(".pdf")
            ) {
                showCvMessage(
                    "Only PDF files are allowed.",
                    true
                );
                return;
            }

            if (file.size > MAX_CV_SIZE) {
                showCvMessage(
                    "Your PDF must be no larger than 5 MB.",
                    true
                );
                return;
            }

            try {
                const session = await getAdminSession();

                if (!session) {
                    throw new Error(
                        "Please sign in with your admin account first."
                    );
                }

                showCvMessage("Uploading your CV...");

                const { error } = await supabaseClient
                    .storage
                    .from(CV_BUCKET)
                    .upload(CV_FILE_PATH, file, {
                        upsert: true,
                        contentType: "application/pdf",
                        cacheControl: "0"
                    });

                if (error) {
                    throw error;
                }

                uploadCvForm.reset();

                showCvMessage(
                    "CV uploaded successfully!"
                );
            } catch (error) {
                showCvMessage(
                    "Upload error: " + error.message,
                    true
                );
            }
        }
    );
}


// ==========================================
// 14. DELETE CURRENT CV
// ==========================================

if (deleteCvBtn) {
    deleteCvBtn.addEventListener("click", async () => {
        const confirmed = confirm(
            "Are you sure you want to permanently delete your CV?"
        );

        if (!confirmed) return;

        try {
            const session = await getAdminSession();

            if (!session) {
                throw new Error(
                    "Please sign in with your admin account first."
                );
            }

            showCvMessage("Deleting your CV...");

            const { error } = await supabaseClient
                .storage
                .from(CV_BUCKET)
                .remove([CV_FILE_PATH]);

            if (error) {
                throw error;
            }

            showCvMessage("CV deleted successfully.");
        } catch (error) {
            showCvMessage(
                "Delete error: " + error.message,
                true
            );
        }
    });
}


// ==========================================
// 15. TEST SUPABASE CLIENT INITIALIZATION
// ==========================================

async function testSupabaseConnection() {
    const status = document.getElementById("supabaseStatus");

    try {
        const { error } = await supabaseClient.auth.getSession();

        if (error) {
            if (status) {
                status.textContent =
                    "Connection error: " + error.message;
            }
            return;
        }

        if (status) {
            status.textContent =
                "View Cv if Interested";
        }
    } catch (error) {
        if (status) {
            status.textContent =
                "Error: " + error.message;
        }
    }
}

testSupabaseConnection();