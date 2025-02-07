const apiKey = 'yourapikey'; // Replace with your actual API key

function GmailFilter() {
  // Get existing labels
  const appliedconfirmation = GmailApp.getUserLabelByName("Applied");
  const adnews = GmailApp.getUserLabelByName("Ad News");
  const adjobs = GmailApp.getUserLabelByName("Ad Jobs");
  const rejectionLabel = GmailApp.getUserLabelByName("Rejection");
  const acceptanceLabel = GmailApp.getUserLabelByName("Acceptance");
  const accountNoticeLabel = GmailApp.getUserLabelByName("Account Notice");
  const unknownLabel = GmailApp.getUserLabelByName("Unknown");
  const eventconfirmation = GmailApp.getUserLabelByName("Event");
  const interviewconfirmation = GmailApp.getUserLabelByName("Interview");

  // Search for threads with no user labels
  const threads = GmailApp.search('has:nouserlabels', 0, 30);
  Logger.log(threads.length);

  // Set the API endpoint URL for Gemini Pro
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=' + apiKey;

  // Process each thread
  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    const threadLabels = threads[i].getLabels();

    for (let j = 0; j < messages.length; j++) {
      Utilities.sleep(20000); // Pause for 20 seconds to avoid API rate limits

      const subject = messages[j].getSubject();
      const body = messages[j].getPlainBody();
      Logger.log("subject:" + subject);
      Logger.log("body: " + body);
      
      // Construct the prompt for the Gemini API
      const prompt = `
          Please analyze the following email content step-by-step to classify it into one of the categories below. Take your time and think carefully at each step to ensure accuracy. Select only one category that best fits the email content.

          ###CATEGORY###
          1. Confirmation email for internship or new graduate positions you applied for: Emails confirming the receipt of your application for an internship or new graduate role. This could include an automated acknowledgement or a more personalized message.
          2. Advertisement emails from companies about products, services, or company news (e.g., blog notifications, newsletters).
          3. Advertisement emails from companies about internship or new graduate job opportunities, company information sessions, or related events.
          4. Document screening rejection OR interview rejection OR rejection notice
          5. Document screening pass OR interview invitation OR job offer notice
          6. Failures for Google Apps Script, My Google account security information, or other account notifications
          7. Confirmation or reminder email for internship or new graduate events/briefing sessions that you have already registered for (may include online URL)
          8. Confirmation or reminder email for individual interviews that you have already scheduled for internship or new graduate positions (may include online URL)
          9. Other or unable to determine
          ---
          ###EMAIL CONTENT###
          Subject: ${subject}
          Body: ${body}
          ---

          **Step-by-step analysis:**

          1. **Understand the Categories:** First, carefully read and understand each category description provided above. Make sure you know what kind of emails each category is meant to capture.
          2. **Analyze Email Content (Subject and Body):**  Read the subject and body of the email provided below. Look for keywords, phrases, and the overall context of the email.
          3. **Match to Category:**  Compare the email content to each category description. Determine which category best aligns with the email's purpose and content. Consider the keywords and context you identified in step 2. Choose only ONE category. If no category seems to fit well, use category 9 ("Other or unable to determine").
          4. **Provide Category and Reason:**  State the chosen category number and provide a brief explanation for your choice. Explain why you believe this category is the best fit based on your analysis.

          ---
          Please provide your answer in the following format. **Make sure to include Category and Reason.**
          Step-by-step Reasoning:
          Step 1: [Reasoning for Step 1 (Understanding Categories)]
          Step 2: [Reasoning for Step 2 (Analyzing Email Content)]
          Step 3: [Reasoning for Step 3 (Matching to Category)]
          Step 4: [Reasoning for Step 4 (Providing Category and Reason)]
          Category: [Number 1-9]
          Reason: [Brief explanation]
          ---
          ###Good Example###
          Step-by-step Reasoning:
          Step 1: I understood the descriptions of categories 1 to 9. I confirmed that category 3 is related to job advertisement emails.
          Step 2: I identified keywords "application receipt" in the subject and phrase "reviewing your qualifications" in the body.
          Step 3: From the keywords and phrase identified in step 2, I determined that this email is a confirmation email for job application receipt. I considered it matches the description of category 3.
          Step 4: Based on the analysis above, I decided category 3 is the best fit and summarized the reason briefly.
          Category: 3
          Reason: The email confirms receipt of the application and informs the recipient that their qualifications are being reviewed.
          `;

      // Prepare the API request payload
      const payload = {
        contents: [{
          parts: [{text: prompt}]
        }]
      };

      // Set the API request options
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload)
      };

      // Send the API request
      const response = UrlFetchApp.fetch(url, options);

      // Parse the API response
      const result = JSON.parse(response.getContentText());

      // Extract the category from the response
      const summary = result.candidates[0].content.parts[0].text;
      Logger.log("Summary: " + summary);
      const categoryMatch = summary.match(/Category:\s*(\d+)/i);
      let category = null;      
      if (categoryMatch && categoryMatch[1]) {
        category = parseInt(categoryMatch[1], 10);
      } else {
        Logger.log("Error: Category number not found in Gemini API response."); 
        Logger.log("Response summary: " + summary);
      }

      // Apply labels and actions based on the category
      switch(category) {
        case 1:
          threads[i].markRead();
          threads[i].addLabel(appliedconfirmation);
          threads[i].moveToArchive();
          Logger.log("Marked email as read and added 'Applied' label.");
          break;
        case 2:
          threads[i].markRead();
          threads[i].moveToTrash();
          threads[i].addLabel(adnews);
          Logger.log("Marked email as read, moved to trash, and added 'Ad News' label.");
          break;
        case 3:
          threads[i].addLabel(adjobs);
          Logger.log("Added 'Ad Jobs' label to the email.");
          break;
        case 4:
          threads[i].addLabel(rejectionLabel);
          threads[i].markRead();
          threads[i].moveToTrash();
          Logger.log("Marked email as read, moved to trash, and added 'Rejection' label.");
          break;
        case 5:
          threads[i].addLabel(acceptanceLabel);
          messages[j].star();
          Logger.log("Starred the email and added 'Acceptance' label.");
          break;
        case 6:
          threads[i].markRead();
          threads[i].addLabel(accountNoticeLabel);
          threads[i].moveToTrash();
          Logger.log("Marked email as read, moved to trash, and added 'Account Notice' label.");
          break;
        case 7:
          threads[i].addLabel(eventconfirmation);
          threads[i].markRead();
          threads[i].moveToArchive();
          Logger.log("Marked email as read, moved to archive, and added 'Event Confirmation' label.");
          break;
        case 8:
          threads[i].addLabel(interviewconfirmation);
          messages[j].star();
          Logger.log("Starred the email and added 'Interview Confirmation' label.");
          break;
        case 9:
          threads[i].addLabel(unknownLabel);
          Logger.log("Added 'Unknown' label to the email.");
          break;
        default:
          Logger.log("No category matched.");
          break;
      }
    }
    Utilities.sleep(20000); // Pause for 20 seconds to avoid API rate limits
  }
}
