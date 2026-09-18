
// ==========================================
// REGISTER
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message = document.getElementById("message");

        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            return;
        }

        try {

            const response = await fetch(
                "http://127.0.0.1:5000/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            message.textContent = data.message;

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to connect to the backend.";

        }

    });

}


// ==========================================
// LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value;

        const password =
            document.getElementById("loginPassword").value;

        const message =
            document.getElementById("loginMessage");

        try {

            const response = await fetch(
                "http://127.0.0.1:5000/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }
            );

            const data = await response.json();

            message.textContent = data.message;

            if (response.ok) {

                localStorage.setItem(
                    "user",
                    JSON.stringify(data.user)
                );

                window.location.href =
                    "dashboard.html";
            }

        } catch (error) {

            console.error(error);

            message.textContent =
                "Unable to connect to the backend.";

        }

    });

}


// ==========================================
// DISPLAY USER NAME
// ==========================================

const userName =
    document.getElementById("userName");

if (userName) {

    const savedUser =
        localStorage.getItem("user");

    if (savedUser) {

        const user =
            JSON.parse(savedUser);

        userName.textContent =
            user.name;
    }

}


// ==========================================
// IMAGE PREVIEW
// ==========================================

const imageInput =
    document.getElementById("imageInput");

const imagePreview =
    document.getElementById("imagePreview");

if (imageInput) {

    imageInput.addEventListener("change", () => {

        const file =
            imageInput.files[0];

        if (!file) {
            return;
        }

        const imageURL =
            URL.createObjectURL(file);

        imagePreview.innerHTML = `
            <img
                src="${imageURL}"
                alt="Selected Image"
                style="max-width: 400px; margin-top: 20px;"
            >
        `;

    });

}


// ==========================================
// IMAGE ANALYSIS
// ==========================================

const analyzeButton =
    document.getElementById("analyzeButton");

const analysisMessage =
    document.getElementById("analysisMessage");

if (analyzeButton) {

    analyzeButton.addEventListener(
        "click",
        async () => {

            const file =
                imageInput.files[0];

            if (!file) {

                analysisMessage.textContent =
                    "Please select an image first.";

                return;
            }


            // Get logged-in user
            const savedUser =
                localStorage.getItem("user");

            if (!savedUser) {

                analysisMessage.textContent =
                    "Please login first.";

                return;
            }


            const user =
                JSON.parse(savedUser);


            // Loading state
            analyzeButton.disabled = true;

            analyzeButton.textContent =
                "Analyzing...";

            analysisMessage.textContent =
                "AI is analyzing your image...";


            try {

                // ==================================
                // CREATE FORM DATA
                // ==================================

                const formData =
                    new FormData();

                formData.append(
                    "image",
                    file
                );

                formData.append(
                    "user_id",
                    user.id
                );


                // ==================================
                // SEND TO FLASK
                // ==================================

                const response =
                    await fetch(
                        "http://127.0.0.1:5000/analyze",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Analysis failed."
                    );
                }


                // ==================================
                // DEBUG OUTPUT
                // ==================================

                console.log(
                    "AI Analysis:",
                    data
                );


                // ==================================
                // MODEL RESULT
                // ==================================

                const results =
                    data.results;

                const prediction =
                    results.reduce(
                        (best, current) =>
                            current.score >
                            best.score
                                ? current
                                : best
                    );


                const label =
                    prediction.label;

                const confidence =
                    (
                        prediction.score * 100
                    ).toFixed(2);


                // ==================================
                // DETERMINE RESULT TYPE
                // ==================================

                const isAI =
                    label
                        .toLowerCase()
                        .includes("fake") ||
                    label
                        .toLowerCase()
                        .includes("ai");


                const resultTitle =
                    isAI
                        ? "AI GENERATED"
                        : "REAL IMAGE";


                const resultIcon =
                    isAI
                        ? "⚠️"
                        : "✅";


                const resultDescription =
                    isAI
                        ? "The model detected patterns associated with AI-generated imagery."
                        : "The model classified this image as real based on the visual patterns it detected.";


                // ==================================
                // FORENSIC DATA
                // ==================================

                const forensics =
                    data.forensics;


                // ==================================
                // EXIF DATA
                // ==================================

                let exifHTML = "";

                if (
                    forensics.has_exif &&
                    forensics.exif
                ) {

                    exifHTML =
                        Object.entries(
                            forensics.exif
                        )
                        .map(
                            ([key, value]) => `
                                <div class="forensic-row">

                                    <span>
                                        ${key}
                                    </span>

                                    <strong>
                                        ${value}
                                    </strong>

                                </div>
                            `
                        )
                        .join("");

                } else {

                    exifHTML = `
                        <p class="no-metadata">
                            No EXIF metadata was found
                            in this image.
                        </p>
                    `;
                }


                // ==================================
                // DISPLAY RESULT
                // ==================================

                analysisMessage.innerHTML = `

                    <div class="analysis-result">

                        <div class="result-icon">
                            ${resultIcon}
                        </div>


                        <h3>
                            ${resultTitle}
                        </h3>


                        <p>
                            ${resultDescription}
                        </p>


                        <p class="confidence">

                            Confidence:
                            <strong>
                                ${confidence}%
                            </strong>

                        </p>


                        <div class="confidence-bar">

                            <div
                                class="confidence-fill"
                                style="width: ${confidence}%"
                            ></div>

                        </div>


                        <!-- IMAGE INFORMATION -->

                        <div class="forensic-details">

                            <h4>
                                Image Information
                            </h4>


                            <div class="forensic-row">

                                <span>
                                    Resolution
                                </span>

                                <strong>
                                    ${forensics.width}
                                    ×
                                    ${forensics.height}
                                </strong>

                            </div>


                            <div class="forensic-row">

                                <span>
                                    Format
                                </span>

                                <strong>
                                    ${forensics.format}
                                </strong>

                            </div>


                            <div class="forensic-row">

                                <span>
                                    Color Mode
                                </span>

                                <strong>
                                    ${forensics.mode}
                                </strong>

                            </div>


                            <!-- PIXEL ANALYSIS -->

                            <h4>
                                Pixel Analysis
                            </h4>


                            <div class="forensic-row">

                                <span>
                                    Brightness
                                </span>

                                <strong>
                                    ${forensics.brightness}
                                </strong>

                            </div>


                            <div class="forensic-row">

                                <span>
                                    Contrast
                                </span>

                                <strong>
                                    ${forensics.contrast}
                                </strong>

                            </div>


                            <div class="forensic-row">

                                <span>
                                    Noise Level
                                </span>

                                <strong>
                                    ${forensics.noise_level}
                                </strong>

                            </div>


                            <div class="forensic-row">

                                <span>
                                    Edge Density
                                </span>

                                <strong>
                                    ${forensics.edge_density}
                                </strong>

                            </div>


                            <!-- METADATA -->

                            <h4>
                                Metadata
                            </h4>


                            <div class="forensic-row">

                                <span>
                                    EXIF Data
                                </span>

                                <strong>
                                    ${
                                        forensics.has_exif
                                            ? "Available"
                                            : "Not Found"
                                    }
                                </strong>

                            </div>


                            ${exifHTML}


                            <!-- FILE FINGERPRINT -->

                            <h4>
                                File Fingerprint
                            </h4>


                            <div class="hash-box">

                                ${forensics.sha256}

                            </div>

                        </div>

                    </div>

                `;


            } catch (error) {

                console.error(
                    "Analysis error:",
                    error
                );

                analysisMessage.textContent =
                    "Unable to analyze the image. Please try again.";

            } finally {

                analyzeButton.disabled =
                    false;

                analyzeButton.textContent =
                    "Analyze Image";

            }

        }
    );

}


// ==========================================
// ANALYSIS HISTORY
// ==========================================

const historyContainer =
    document.getElementById("history");

if (historyContainer) {

    const savedUser =
        localStorage.getItem("user");

    if (savedUser) {

        const user =
            JSON.parse(savedUser);

        loadHistory(user.id);

    } else {

        historyContainer.innerHTML =
            "Please login to view your analysis history.";

    }

}


// ==========================================
// LOAD HISTORY
// ==========================================

async function loadHistory(userId) {

    try {

        const response =
            await fetch(
                `http://127.0.0.1:5000/history/${userId}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load history."
            );

        }


        const history =
            data.history;


        if (
            !history ||
            history.length === 0
        ) {

            historyContainer.innerHTML =
                "No analyses yet.";

            return;

        }


        historyContainer.innerHTML =
            history
                .map(
                    (item) => {

                        const confidence =
                            Number(
                                item.confidence
                            ).toFixed(2);


                        const date =
                            new Date(
                                item.created_at
                            ).toLocaleString();


                        return `

                            <div class="history-item">

                                <div>

                                    <strong>
                                        ${item.result}
                                    </strong>


                                    <p>
                                        ${item.image_path}
                                    </p>


                                    <small>
                                        Confidence:
                                        ${confidence}%
                                    </small>


                                    <br>


                                    <small>
                                        ${date}
                                    </small>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");


    } catch (error) {

        console.error(
            "History error:",
            error
        );

        historyContainer.innerHTML =
            "Unable to load analysis history.";

    }

}
