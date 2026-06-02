import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import StarRating from "@/components/StarRating";
import { CheckCircle } from "lucide-react";

export default function ReviewPage() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || rating === 0 || !comment.trim()) {
      setError(t("Please fill all fields and select a rating.", "يرجى ملء جميع الحقول واختيار تقييم."));
      return;
    }
    const review = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      rating,
      comment: comment.trim(),
      approved: false,
      timestamp: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem("admin_reviews") || "[]");
    localStorage.setItem("admin_reviews", JSON.stringify([...existing, review]));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pt-16 pb-28 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("Thank you!", "شكراً لك!")}</h2>
          <p className="text-muted-foreground">{t("Your review has been submitted and is pending approval.", "تم إرسال تقييمك وهو في انتظار الموافقة.")}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-28">
      <div className="max-w-xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("Leave a Review", "اترك تقييمًا")}</h1>
          <p className="text-muted-foreground mb-8">{t("Share your experience with us", "شاركنا تجربتك")}</p>

          <form onSubmit={handleSubmit} className="bg-card border border-white/5 rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">{t("Your Name", "اسمك")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Enter your name", "أدخل اسمك")}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                data-testid="input-review-name"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">{t("Rating", "التقييم")}</label>
              <StarRating rating={rating} onRate={setRating} size={28} />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">{t("Comment", "تعليق")}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("Tell us about your experience...", "أخبرنا عن تجربتك...")}
                rows={4}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                data-testid="input-review-comment"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition"
              data-testid="btn-submit-review"
            >
              {t("Submit Review", "إرسال التقييم")}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
