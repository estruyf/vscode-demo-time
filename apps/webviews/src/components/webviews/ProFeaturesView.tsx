import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Github, Star, BarChart3, FileDown, Shield, Headphones } from "lucide-react";
import { Loader as Spinner } from "vscrui";
import { messageHandler } from "@estruyf/vscode/dist/client";
import { WebViewMessages } from "@demotime/common";
import '../../styles/config.css';
import { AppHeader } from "../layout";

interface ProFeature {
  icon: React.ElementType;
  title: string;
  description: string;
  available: boolean;
}

const ProFeaturesView = () => {
  const [loading, setLoading] = useState(true);
  const [isSponsor, setIsSponsor] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const proFeatures: ProFeature[] = [
    {
      icon: BarChart3,
      title: "Presentation Analytics",
      description: "Track your demo performance with detailed analytics including timing, navigation patterns, and engagement metrics. Export sessions for review and improvement.",
      available: true,
    },
    {
      icon: FileDown,
      title: "Advanced Export Options",
      description: "Export your slides to PDF with custom templates and branding. Share your presentations with ease.",
      available: true,
    },
    {
      icon: Shield,
      title: "Priority Support",
      description: "Get faster response times and dedicated support channels to help you create amazing demos.",
      available: true,
    },
    {
      icon: Headphones,
      title: "Exclusive Features Access",
      description: "Be the first to access new experimental features and beta releases. Shape the future of Demo Time.",
      available: true,
    },
  ];

  useEffect(() => {
    loadSponsorStatus();
  }, []);

  const loadSponsorStatus = async () => {
    setLoading(true);
    try {
      const response = await messageHandler.request<{ isSponsor: boolean }>(
        WebViewMessages.toVscode.proFeatures.getSponsorStatus
      );
      setIsSponsor(response?.isSponsor || false);
    } catch (error) {
      console.error("Error loading sponsor status:", error);
      setIsSponsor(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthenticate = async () => {
    setAuthenticating(true);
    try {
      await messageHandler.send(WebViewMessages.toVscode.runCommand, "demo-time.authenticate");
      // Wait a bit for the authentication to complete
      setTimeout(async () => {
        await loadSponsorStatus();
        setAuthenticating(false);
      }, 2000);
    } catch (error) {
      console.error("Error during authentication:", error);
      setAuthenticating(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppHeader
        title="Pro Features"
        subtitle={isSponsor ? "Thank you for being a sponsor! 🎉" : "Unlock the full potential of Demo Time"}
        showValidation={false}
        onToggleValidation={() => { }}
        fileControls={null}
        actionControls={null}
        autoSaveStatus={undefined}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Banner */}
        <div className={`mb-8 p-6 rounded-lg border-2 ${
          isSponsor
            ? "bg-green-50 dark:bg-green-900/20 border-green-500"
            : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Star className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                isSponsor ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
              }`} />
              <div>
                <h3 className={`text-lg font-semibold mb-1 ${
                  isSponsor
                    ? "text-green-900 dark:text-green-100"
                    : "text-yellow-900 dark:text-yellow-100"
                }`}>
                  {isSponsor ? "Pro Features Unlocked" : "Unlock Pro Features"}
                </h3>
                <p className={`text-sm ${
                  isSponsor
                    ? "text-green-700 dark:text-green-300"
                    : "text-yellow-700 dark:text-yellow-300"
                }`}>
                  {isSponsor
                    ? "You have full access to all Pro features. Thank you for supporting Demo Time!"
                    : "Become a GitHub Sponsor to unlock all Pro features and support the continued development of Demo Time."}
                </p>
              </div>
            </div>
            {!isSponsor && (
              <Button
                variant="dark"
                onClick={handleAuthenticate}
                icon={Github}
                disabled={authenticating}
                className="flex-shrink-0"
              >
                {authenticating ? "Authenticating..." : "Authenticate with GitHub"}
              </Button>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            What's Included in Pro
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`p-6 rounded-lg border transition-all ${
                    isSponsor
                      ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md"
                      : "bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      isSponsor
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        isSponsor
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {feature.title}
                        </h3>
                        {!isSponsor && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        {!isSponsor && (
          <div className="mt-12 p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Ready to Unlock Pro Features?
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                By becoming a GitHub Sponsor, you'll get access to all Pro features and help support
                the ongoing development of Demo Time. Your sponsorship helps keep this project free
                and accessible to everyone.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="dark"
                  onClick={handleAuthenticate}
                  icon={Github}
                  disabled={authenticating}
                  className="px-8 py-3"
                >
                  {authenticating ? "Authenticating..." : "Authenticate with GitHub"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    messageHandler.send(
                      WebViewMessages.toVscode.runCommand,
                      "demo-time.openSupportTheProject"
                    );
                  }}
                  icon={Star}
                  className="px-8 py-3"
                >
                  Learn About Sponsorship
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Thank You Message for Sponsors */}
        {isSponsor && (
          <div className="mt-12 p-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                <Star className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Thank You for Your Support! 🙏
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Your sponsorship makes a real difference in keeping Demo Time free and continuously improving.
                We're grateful for your support and excited to see what you create with these Pro features!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Have feedback or feature requests? We'd love to hear from you.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProFeaturesView;
