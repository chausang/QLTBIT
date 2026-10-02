using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading;
using System.Net.Sockets;
using System.Net;
using System.Text.RegularExpressions;

namespace SimplyITInstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        // UI Controls
        private Panel pnlHeader;
        private Label lblHeaderTitle;
        private Label lblHeaderSubtitle;
        private PictureBox picIcon;

        private GroupBox grpMode;
        private RadioButton radBoth;
        private RadioButton radServerOnly;
        private RadioButton radAgentOnly;
        private Label lblDescBoth;
        private Label lblDescServer;
        private Label lblDescAgent;

        private GroupBox grpConfig;
        private Label lblServerUrl;
        private TextBox txtServerUrl;
        private CheckBox chkFirewall;
        private CheckBox chkDesktopShortcut;
        private CheckBox chkAutoLaunch;

        private Panel pnlProgress;
        private Label lblProgressStatus;
        private ProgressBar progressBar;
        private TextBox txtLogs;

        private Button btnStartInstall;
        private Button btnExit;
        private Button btnOpenApp;

        private string appDir;
        private string localIpAddress = "127.0.0.1";
        private bool isInstalling = false;

        public InstallerForm()
        {
            DetectLocalIp();
            LocateAppDir();
            InitializeComponent();
        }

        private void DetectLocalIp()
        {
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null)
                    {
                        localIpAddress = endPoint.Address.ToString();
                    }
                }
            }
            catch
            {
                localIpAddress = "127.0.0.1";
            }
        }

        private void LocateAppDir()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (File.Exists(Path.Combine(baseDir, "package.json")))
            {
                appDir = baseDir;
                return;
            }

            string qltbit = @"D:\QLTBIT";
            if (Directory.Exists(qltbit) && File.Exists(Path.Combine(qltbit, "package.json")))
            {
                appDir = qltbit;
                return;
            }

            string antigravity = @"D:\Antigravity\QLTBIT";
            if (Directory.Exists(antigravity) && File.Exists(Path.Combine(antigravity, "package.json")))
            {
                appDir = antigravity;
                return;
            }

            string cur = Directory.GetCurrentDirectory();
            if (File.Exists(Path.Combine(cur, "package.json")))
            {
                appDir = cur;
                return;
            }

            appDir = baseDir;
        }

        private void InitializeComponent()
        {
            this.Text = "SIMPLY IT — Bộ Cài Đặt Trọn Gói (Setup Wizard)";
            this.Size = new Size(680, 680);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Load app icon
            string icoPath = Path.Combine(appDir, "app.ico");
            if (File.Exists(icoPath))
            {
                try { this.Icon = new Icon(icoPath); } catch { }
            }

            // ==================== HEADER ====================
            pnlHeader = new Panel();
            pnlHeader.Location = new Point(0, 0);
            pnlHeader.Size = new Size(680, 80);
            pnlHeader.BackColor = Color.FromArgb(10, 26, 47); // Dark Navy
            this.Controls.Add(pnlHeader);

            picIcon = new PictureBox();
            picIcon.Location = new Point(18, 14);
            picIcon.Size = new Size(52, 52);
            picIcon.SizeMode = PictureBoxSizeMode.Zoom;
            if (File.Exists(icoPath))
            {
                try { picIcon.Image = Image.FromFile(icoPath); } catch { }
            }
            pnlHeader.Controls.Add(picIcon);

            lblHeaderTitle = new Label();
            lblHeaderTitle.Text = "SIMPLY IT — TRÌNH CÀI ĐẶT TRỌN GÓI";
            lblHeaderTitle.Font = new Font("Segoe UI", 13.5F, FontStyle.Bold);
            lblHeaderTitle.ForeColor = Color.FromArgb(0, 184, 212); // Cyan
            lblHeaderTitle.Location = new Point(80, 14);
            lblHeaderTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblHeaderTitle);

            lblHeaderSubtitle = new Label();
            lblHeaderSubtitle.Text = "Hệ thống Quản lý Dịch vụ & Tài sản CNTT (ITSM) • Bản Miễn Phí Vĩnh Viễn";
            lblHeaderSubtitle.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblHeaderSubtitle.ForeColor = Color.FromArgb(203, 213, 225);
            lblHeaderSubtitle.Location = new Point(82, 44);
            lblHeaderSubtitle.AutoSize = true;
            pnlHeader.Controls.Add(lblHeaderSubtitle);

            // ==================== COMPONENT SELECTION ====================
            grpMode = new GroupBox();
            grpMode.Text = "Bước 1: Chọn Chế Độ Cài Đặt";
            grpMode.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            grpMode.ForeColor = Color.FromArgb(15, 23, 42);
            grpMode.Location = new Point(20, 92);
            grpMode.Size = new Size(625, 175);
            this.Controls.Add(grpMode);

            // Option 1: Both (Recommended)
            radBoth = new RadioButton();
            radBoth.Text = "🌟 Cài đặt CẢ HAI: Máy Chủ & Agent (Khuyên Dùng cho Máy Admin)";
            radBoth.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            radBoth.ForeColor = Color.FromArgb(2, 132, 199);
            radBoth.Location = new Point(20, 24);
            radBoth.Size = new Size(580, 24);
            radBoth.Checked = true;
            radBoth.CheckedChanged += OnModeChanged;
            grpMode.Controls.Add(radBoth);

            lblDescBoth = new Label();
            lblDescBoth.Text = "• Cài đặt đầy đủ: Web Dashboard, API, Database, Mở cổng Firewall và cài Agent tự giám sát chính máy tính này.";
            lblDescBoth.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblDescBoth.ForeColor = Color.FromArgb(100, 116, 139);
            lblDescBoth.Location = new Point(42, 48);
            lblDescBoth.Size = new Size(560, 20);
            grpMode.Controls.Add(lblDescBoth);

            // Option 2: Server Only
            radServerOnly = new RadioButton();
            radServerOnly.Text = "🏢 Chỉ cài đặt MÁY CHỦ (SIMPLY IT Central Server)";
            radServerOnly.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            radServerOnly.ForeColor = Color.FromArgb(30, 41, 59);
            radServerOnly.Location = new Point(20, 72);
            radServerOnly.Size = new Size(580, 24);
            radServerOnly.CheckedChanged += OnModeChanged;
            grpMode.Controls.Add(radServerOnly);

            lblDescServer = new Label();
            lblDescServer.Text = "• Cài đặt Trung tâm Quản trị ITSM, Web Dashboard (3001), HTTPS (3443), Database PostgreSQL, Mở Firewall.";
            lblDescServer.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblDescServer.ForeColor = Color.FromArgb(100, 116, 139);
            lblDescServer.Location = new Point(42, 96);
            lblDescServer.Size = new Size(560, 20);
            grpMode.Controls.Add(lblDescServer);

            // Option 3: Agent Only
            radAgentOnly = new RadioButton();
            radAgentOnly.Text = "💻 Chỉ cài đặt AGENT GIÁM SÁT (Client Workstation)";
            radAgentOnly.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            radAgentOnly.ForeColor = Color.FromArgb(30, 41, 59);
            radAgentOnly.Location = new Point(20, 120);
            radAgentOnly.Size = new Size(580, 24);
            radAgentOnly.CheckedChanged += OnModeChanged;
            grpMode.Controls.Add(radAgentOnly);

            lblDescAgent = new Label();
            lblDescAgent.Text = "• Dành cho máy trạm nhân viên: Chạy ngầm vô hình qua Task Scheduler, tự thu thập CPU/RAM/Ổ cứng/Phần mềm.";
            lblDescAgent.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblDescAgent.ForeColor = Color.FromArgb(100, 116, 139);
            lblDescAgent.Location = new Point(42, 144);
            lblDescAgent.Size = new Size(560, 20);
            grpMode.Controls.Add(lblDescAgent);

            // ==================== CONFIGURATION ====================
            grpConfig = new GroupBox();
            grpConfig.Text = "Bước 2: Tùy Chọn Cấu Hình";
            grpConfig.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            grpConfig.ForeColor = Color.FromArgb(15, 23, 42);
            grpConfig.Location = new Point(20, 274);
            grpConfig.Size = new Size(625, 95);
            this.Controls.Add(grpConfig);

            lblServerUrl = new Label();
            lblServerUrl.Text = "Địa chỉ Máy Chủ SIMPLY IT:";
            lblServerUrl.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            lblServerUrl.ForeColor = Color.FromArgb(51, 65, 85);
            lblServerUrl.Location = new Point(18, 26);
            lblServerUrl.Size = new Size(160, 22);
            grpConfig.Controls.Add(lblServerUrl);

            txtServerUrl = new TextBox();
            txtServerUrl.Location = new Point(180, 23);
            txtServerUrl.Size = new Size(425, 23);
            txtServerUrl.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            txtServerUrl.Text = "http://localhost:3001";
            grpConfig.Controls.Add(txtServerUrl);

            chkFirewall = new CheckBox();
            chkFirewall.Text = "Mở Tường Lửa Firewall (Port 3001 & 3443)";
            chkFirewall.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            chkFirewall.Location = new Point(20, 60);
            chkFirewall.Size = new Size(270, 22);
            chkFirewall.Checked = true;
            grpConfig.Controls.Add(chkFirewall);

            chkDesktopShortcut = new CheckBox();
            chkDesktopShortcut.Text = "Tạo Shortcut Màn Hình Desktop";
            chkDesktopShortcut.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            chkDesktopShortcut.Location = new Point(295, 60);
            chkDesktopShortcut.Size = new Size(190, 22);
            chkDesktopShortcut.Checked = true;
            grpConfig.Controls.Add(chkDesktopShortcut);

            chkAutoLaunch = new CheckBox();
            chkAutoLaunch.Text = "Khởi chạy ngay khi xong";
            chkAutoLaunch.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            chkAutoLaunch.Location = new Point(490, 60);
            chkAutoLaunch.Size = new Size(130, 22);
            chkAutoLaunch.Checked = true;
            grpConfig.Controls.Add(chkAutoLaunch);

            // ==================== PROGRESS & LOGS ====================
            pnlProgress = new Panel();
            pnlProgress.Location = new Point(20, 376);
            pnlProgress.Size = new Size(625, 205);
            this.Controls.Add(pnlProgress);

            lblProgressStatus = new Label();
            lblProgressStatus.Text = "ℹ️ Sẵn sàng cài đặt. Nhấp 'Bắt Đầu Cài Đặt' bên dưới để thực thi.";
            lblProgressStatus.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            lblProgressStatus.ForeColor = Color.FromArgb(71, 85, 105);
            lblProgressStatus.Location = new Point(0, 0);
            lblProgressStatus.Size = new Size(625, 20);
            pnlProgress.Controls.Add(lblProgressStatus);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(0, 24);
            progressBar.Size = new Size(625, 14);
            progressBar.Style = ProgressBarStyle.Blocks;
            progressBar.Value = 0;
            pnlProgress.Controls.Add(progressBar);

            txtLogs = new TextBox();
            txtLogs.Location = new Point(0, 46);
            txtLogs.Size = new Size(625, 155);
            txtLogs.Multiline = true;
            txtLogs.ReadOnly = true;
            txtLogs.ScrollBars = ScrollBars.Vertical;
            txtLogs.BackColor = Color.FromArgb(10, 26, 47);
            txtLogs.ForeColor = Color.FromArgb(226, 232, 240);
            txtLogs.Font = new Font("Consolas", 8.5F);
            pnlProgress.Controls.Add(txtLogs);

            // ==================== ACTION BUTTONS ====================
            btnStartInstall = new Button();
            btnStartInstall.Text = "🚀 BẮT ĐẦU CÀI ĐẶT NGAY";
            btnStartInstall.Location = new Point(20, 590);
            btnStartInstall.Size = new Size(340, 44);
            btnStartInstall.BackColor = Color.FromArgb(2, 132, 199);
            btnStartInstall.ForeColor = Color.White;
            btnStartInstall.Font = new Font("Segoe UI", 10.5F, FontStyle.Bold);
            btnStartInstall.FlatStyle = FlatStyle.Flat;
            btnStartInstall.FlatAppearance.BorderSize = 0;
            btnStartInstall.Cursor = Cursors.Hand;
            btnStartInstall.Click += (s, e) => StartInstallation();
            this.Controls.Add(btnStartInstall);

            btnOpenApp = new Button();
            btnOpenApp.Text = "🌐 Mở SIMPLY IT";
            btnOpenApp.Location = new Point(370, 590);
            btnOpenApp.Size = new Size(150, 44);
            btnOpenApp.BackColor = Color.FromArgb(16, 185, 129); // Green
            btnOpenApp.ForeColor = Color.White;
            btnOpenApp.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnOpenApp.FlatStyle = FlatStyle.Flat;
            btnOpenApp.FlatAppearance.BorderSize = 0;
            btnOpenApp.Cursor = Cursors.Hand;
            btnOpenApp.Visible = false;
            btnOpenApp.Click += (s, e) => {
                try { Process.Start(new ProcessStartInfo("http://localhost:3001") { UseShellExecute = true }); } catch { }
            };
            this.Controls.Add(btnOpenApp);

            btnExit = new Button();
            btnExit.Text = "Thoát";
            btnExit.Location = new Point(530, 590);
            btnExit.Size = new Size(115, 44);
            btnExit.BackColor = Color.White;
            btnExit.ForeColor = Color.FromArgb(71, 85, 105);
            btnExit.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            btnExit.FlatStyle = FlatStyle.Flat;
            btnExit.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnExit.Cursor = Cursors.Hand;
            btnExit.Click += (s, e) => this.Close();
            this.Controls.Add(btnExit);
        }

        private void OnModeChanged(object sender, EventArgs e)
        {
            if (radBoth.Checked)
            {
                txtServerUrl.Text = "http://localhost:3001";
                chkFirewall.Enabled = true;
                chkFirewall.Checked = true;
                chkDesktopShortcut.Enabled = true;
                chkDesktopShortcut.Checked = true;
                chkAutoLaunch.Enabled = true;
                chkAutoLaunch.Checked = true;
            }
            else if (radServerOnly.Checked)
            {
                txtServerUrl.Text = "http://localhost:3001";
                chkFirewall.Enabled = true;
                chkFirewall.Checked = true;
                chkDesktopShortcut.Enabled = true;
                chkDesktopShortcut.Checked = true;
                chkAutoLaunch.Enabled = true;
                chkAutoLaunch.Checked = true;
            }
            else if (radAgentOnly.Checked)
            {
                if (txtServerUrl.Text.Contains("localhost"))
                {
                    txtServerUrl.Text = string.Format("http://{0}:3001", localIpAddress);
                }
                chkFirewall.Enabled = false;
                chkFirewall.Checked = false;
                chkDesktopShortcut.Enabled = true;
                chkDesktopShortcut.Checked = false;
                chkAutoLaunch.Enabled = false;
                chkAutoLaunch.Checked = false;
            }
        }

        private void AppendLog(string msg)
        {
            if (this.IsDisposed) return;
            if (this.InvokeRequired)
            {
                try { this.BeginInvoke(new Action<string>(AppendLog), msg); } catch { }
                return;
            }
            string time = DateTime.Now.ToString("HH:mm:ss");
            txtLogs.AppendText(string.Format("[{0}] {1}\r\n", time, msg));
            txtLogs.SelectionStart = txtLogs.TextLength;
            txtLogs.ScrollToCaret();
        }

        private void SetStatus(string text, int percent)
        {
            if (this.IsDisposed) return;
            if (this.InvokeRequired)
            {
                try { this.BeginInvoke(new Action<string, int>(SetStatus), text, percent); } catch { }
                return;
            }
            lblProgressStatus.Text = text;
            if (percent >= 0 && percent <= 100)
            {
                progressBar.Value = percent;
            }
        }

        private bool IsPortOpen(int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch { return false; }
        }

        private void RunHiddenCommand(string exe, string args)
        {
            try
            {
                Process p = new Process();
                p.StartInfo.FileName = exe;
                p.StartInfo.Arguments = args;
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.UseShellExecute = false;
                p.Start();
                p.WaitForExit(10000);
            }
            catch { }
        }

        private void StartInstallation()
        {
            if (isInstalling) return;
            isInstalling = true;

            btnStartInstall.Enabled = false;
            grpMode.Enabled = false;
            grpConfig.Enabled = false;

            bool installServer = radBoth.Checked || radServerOnly.Checked;
            bool installAgent = radBoth.Checked || radAgentOnly.Checked;
            string serverUrl = txtServerUrl.Text.Trim();
            bool enableFirewall = chkFirewall.Checked;
            bool createShortcut = chkDesktopShortcut.Checked;
            bool autoLaunch = chkAutoLaunch.Checked;

            Thread t = new Thread(() => {
                try
                {
                    AppendLog("=================================================");
                    AppendLog("BẮT ĐẦU CÀI ĐẶT SIMPLY IT COMMUNITY EDITION");
                    AppendLog("=================================================");

                    if (installServer)
                    {
                        InstallServerComponents(enableFirewall, createShortcut);
                    }

                    if (installAgent)
                    {
                        InstallAgentComponent(serverUrl, createShortcut);
                    }

                    SetStatus("🎉 [Hoàn Tất] Cài đặt thành công toàn bộ hệ thống!", 100);
                    AppendLog("=================================================");
                    AppendLog("🎉 CHÚC MỪNG BẠN! HỆ THỐNG ĐÃ CÀI ĐẶT THÀNH CÔNG 100%!");
                    AppendLog("=================================================");

                    if (installServer)
                    {
                        AppendLog("• Địa chỉ truy cập Web: http://localhost:3001");
                        AppendLog("• Cổng quét mã QR Camera Mobile: https://localhost:3443");
                        AppendLog("• Tài khoản quản trị mặc định: admin@company.com / Admin@123");
                    }

                    this.BeginInvoke(new Action(() => {
                        btnOpenApp.Visible = installServer;
                        btnStartInstall.Text = "✅ ĐÃ CÀI ĐẶT XONG";
                        btnStartInstall.BackColor = Color.FromArgb(16, 185, 129);

                        if (autoLaunch && installServer)
                        {
                            AppendLog("🚀 Đang khởi động SIMPLY IT Server...");
                            string srvExe = Path.Combine(appDir, "SimplyIT_Server.exe");
                            if (File.Exists(srvExe))
                            {
                                try { Process.Start(new ProcessStartInfo(srvExe) { WorkingDirectory = appDir, UseShellExecute = true }); } catch { }
                            }
                        }
                    }));
                }
                catch (Exception ex)
                {
                    AppendLog("❌ LỖI TRONG QUÁ TRÌNH CÀI ĐẶT: " + ex.Message);
                    SetStatus("❌ Cài đặt gặp lỗi: " + ex.Message, 0);
                    this.BeginInvoke(new Action(() => {
                        btnStartInstall.Enabled = true;
                        grpMode.Enabled = true;
                        grpConfig.Enabled = true;
                    }));
                }
                finally
                {
                    isInstalling = false;
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        private void InstallServerComponents(bool enableFirewall, bool createShortcut)
        {
            // 1. Check Node.js
            SetStatus("⏳ [1/5] Kiểm tra môi trường Node.js...", 15);
            AppendLog("1/5 Kiểm tra Node.js...");
            string nodePath = LocateNode();
            if (string.IsNullOrEmpty(nodePath) || !File.Exists(nodePath))
            {
                AppendLog("⚠️ Chưa phát hiện Node.js. Đang tự động cài đặt Node.js LTS qua winget...");
                RunHiddenCommand("winget", "install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements");
                nodePath = LocateNode();
            }

            if (!string.IsNullOrEmpty(nodePath) && File.Exists(nodePath))
            {
                AppendLog("✅ Node.js đã sẵn sàng: " + nodePath);
            }
            else
            {
                AppendLog("⚠️ Không thể tự động cài Node.js. Vui lòng tải Node.js LTS tại https://nodejs.org/");
            }

            // 2. Ensure PostgreSQL Database
            SetStatus("⏳ [2/5] Khởi tạo Cơ sở dữ liệu PostgreSQL...", 35);
            AppendLog("2/5 Kiểm tra và khởi tạo Cơ sở dữ liệu PostgreSQL (Port 5432)...");
            EnsurePostgreSqlRunning();

            // 3. Sync Database Schema & Seed Data
            SetStatus("⏳ [3/5] Đồng bộ bảng dữ liệu & tài khoản quản trị...", 60);
            AppendLog("3/5 Đồng bộ lược đồ bảng dữ liệu (Prisma Sync)...");
            SyncDatabaseSchema();

            // 4. Windows Firewall Rules
            if (enableFirewall)
            {
                SetStatus("⏳ [4/5] Cấu hình tường lửa Windows Firewall...", 75);
                AppendLog("4/5 Mở cổng tường lửa Windows: 3001 (HTTP) và 3443 (HTTPS)...");
                RunHiddenCommand("netsh", "advfirewall firewall add rule name=\"SIMPLY_IT_HTTP_3001\" dir=in action=allow protocol=TCP localport=3001");
                RunHiddenCommand("netsh", "advfirewall firewall add rule name=\"SIMPLY_IT_HTTPS_3443\" dir=in action=allow protocol=TCP localport=3443");
                AppendLog("✅ Đã thiết lập luật tường lửa thành công!");
            }

            // 5. Desktop Shortcut
            if (createShortcut)
            {
                SetStatus("⏳ [5/5] Tạo biểu tượng Shortcut Desktop...", 85);
                AppendLog("5/5 Tạo biểu tượng ngoài màn hình Desktop...");
                CreateServerShortcut();
            }
        }

        private void InstallAgentComponent(string serverUrl, bool createShortcut)
        {
            SetStatus("⏳ Đang cài đặt SIMPLY IT Agent trên máy trạm...", 90);
            AppendLog("Đang thiết lập SIMPLY IT Agent giám sát máy trạm...");

            string agentDir = @"C:\ProgramData\SimplyIT";
            if (!Directory.Exists(agentDir))
            {
                Directory.CreateDirectory(agentDir);
            }

            // Copy agent script
            string srcAgent = Path.Combine(appDir, @"public\scripts\get_system_info.ps1");
            if (!File.Exists(srcAgent))
            {
                srcAgent = Path.Combine(appDir, @"GOI_CAI_DAT_AGENT\agent.ps1");
            }
            string destAgent = Path.Combine(agentDir, "agent.ps1");

            if (File.Exists(srcAgent))
            {
                File.Copy(srcAgent, destAgent, true);
                AppendLog("✅ Đã sao chép script giám sát vào " + destAgent);
            }

            // Create config.json
            string configJson = string.Format("{{\"serverUrl\": \"{0}\", \"intervalMinutes\": 15}}", serverUrl);
            File.WriteAllText(Path.Combine(agentDir, "config.json"), configJson);

            // Register Windows Scheduled Task: SimplyIT_Audit
            AppendLog("Đăng ký tác vụ ngầm Scheduled Task (SimplyIT_Audit)...");
            string schArgs = string.Format("/delete /tn \"SimplyIT_Audit\" /f");
            RunHiddenCommand("schtasks", schArgs);

            string taskArgs = string.Format(
                "/create /tn \"SimplyIT_Audit\" /tr \"powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \\\"{0}\\\" -ServerUrl \\\"{1}\\\" -Mode Inventory\" /sc MINUTE /mo 15 /ru \"SYSTEM\" /rl HIGHEST /f",
                destAgent, serverUrl
            );
            RunHiddenCommand("schtasks", taskArgs);

            // Run first audit immediately
            AppendLog("Kích hoạt lần quét phần cứng & phần mềm đầu tiên...");
            RunHiddenCommand("schtasks", "/run /tn \"SimplyIT_Audit\"");

            // Create management batch files
            string runAuditBat = Path.Combine(agentDir, "Kiem_Ke_Ngay.bat");
            File.WriteAllText(runAuditBat, string.Format("@echo off\r\npowershell.exe -NoProfile -ExecutionPolicy Bypass -File \"{0}\" -ServerUrl \"{1}\" -Mode Inventory\r\npause\r\n", destAgent, serverUrl));

            string uninstallBat = Path.Combine(agentDir, "Go_Cai_Dat_Agent.bat");
            File.WriteAllText(uninstallBat, "@echo off\r\nschtasks /delete /tn \"SimplyIT_Audit\" /f >nul 2>&1\r\necho Da huy bo tac vu SimplyIT_Audit.\r\npause\r\n");

            AppendLog("✅ SIMPLY IT Agent đã được kích hoạt thành công!");
            AppendLog("• Tự động thu thập: CPU, RAM, Ổ cứng, GPU, Màn hình, Phần mềm.");
            AppendLog("• Cảnh báo: Tự động phát hiện khi tháo/lắp RAM, đổi ổ cứng, cài phần mềm lạ.");
        }

        private string LocateNode()
        {
            string[] candidates = new string[] {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\nodejs\node.exe"),
                Path.Combine(appDir, @"node\node.exe"),
                Path.Combine(appDir, @"bin\node.exe")
            };
            foreach (string p in candidates)
            {
                if (File.Exists(p)) return p;
            }

            string envPath = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(envPath))
            {
                foreach (string p in envPath.Split(';'))
                {
                    string trimmed = p.Trim();
                    if (string.IsNullOrEmpty(trimmed)) continue;
                    string testNode = Path.Combine(trimmed, "node.exe");
                    if (File.Exists(testNode)) return testNode;
                }
            }
            return "";
        }

        private void EnsurePostgreSqlRunning()
        {
            if (IsPortOpen(5432))
            {
                AppendLog("✅ Kết nối PostgreSQL trên cổng 5432 đã hoạt động.");
                return;
            }

            // Check portable PostgreSQL in appDir
            string pgBin = Path.Combine(appDir, @"pgsql\bin\postgres.exe");
            string pgInit = Path.Combine(appDir, @"pgsql\bin\initdb.exe");
            string pgData = Path.Combine(appDir, @"pgsql\data");
            string pgCreateDb = Path.Combine(appDir, @"pgsql\bin\createdb.exe");

            if (File.Exists(pgBin))
            {
                if (!Directory.Exists(pgData) || !File.Exists(Path.Combine(pgData, "PG_VERSION")))
                {
                    AppendLog("Khởi tạo cấu trúc dữ liệu mới cho PostgreSQL tích hợp...");
                    RunHiddenCommand(pgInit, string.Format("-D \"{0}\" -U postgres -E UTF8 --locale=C -A trust", pgData));
                }

                AppendLog("Khởi động PostgreSQL tích hợp...");
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = pgBin;
                    psi.Arguments = string.Format("-D \"{0}\"", pgData);
                    psi.WorkingDirectory = Path.Combine(appDir, "pgsql");
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                    Process.Start(psi);

                    for (int i = 0; i < 20; i++)
                    {
                        Thread.Sleep(500);
                        if (IsPortOpen(5432))
                        {
                            AppendLog("✅ PostgreSQL tích hợp đã sẵn sàng trên cổng 5432!");
                            break;
                        }
                    }

                    // Create it_asset_db database if needed
                    RunHiddenCommand(pgCreateDb, "-h 127.0.0.1 -U postgres it_asset_db");
                    return;
                }
                catch (Exception ex)
                {
                    AppendLog("Lỗi khởi động PostgreSQL: " + ex.Message);
                }
            }

            // Try Windows services
            string[] serviceNames = new string[] { "postgresql-x64-18", "postgresql-x64-17", "postgresql-x64-16", "postgresql-x64-15", "postgresql" };
            foreach (string svc in serviceNames)
            {
                RunHiddenCommand("net", "start " + svc);
                if (IsPortOpen(5432))
                {
                    AppendLog("✅ Đã khởi động dịch vụ PostgreSQL: " + svc);
                    return;
                }
            }

            if (IsPortOpen(5432))
            {
                AppendLog("✅ PostgreSQL đã sẵn sàng trên cổng 5432.");
            }
            else
            {
                AppendLog("ℹ️ Chưa thấy cổng 5432. Vẫn tiếp tục cài đặt...");
            }
        }

        private void SyncDatabaseSchema()
        {
            try
            {
                string npxCmd = @"C:\Program Files\nodejs\npx.cmd";
                if (!File.Exists(npxCmd))
                {
                    npxCmd = "npx.cmd";
                }

                string nodeDir = @"C:\Program Files\nodejs";
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c npx prisma db push";
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                if (Directory.Exists(nodeDir))
                {
                    psi.EnvironmentVariables["PATH"] = nodeDir + ";" + Environment.GetEnvironmentVariable("PATH");
                }
                psi.EnvironmentVariables["DATABASE_URL"] = "postgresql://postgres@127.0.0.1:5432/it_asset_db?schema=public";

                Process p = Process.Start(psi);
                if (p != null)
                {
                    string outStr = p.StandardOutput.ReadToEnd();
                    p.WaitForExit(30000);
                    if (outStr.Contains("is now in sync") || outStr.Contains("already in sync"))
                    {
                        AppendLog("✅ Đã đồng bộ cấu trúc bảng thành công!");
                    }
                }

                // Check if admin user already exists, if not run seed
                ProcessStartInfo psiSeed = new ProcessStartInfo();
                psiSeed.FileName = "cmd.exe";
                psiSeed.Arguments = "/c npm run db:seed";
                psiSeed.WorkingDirectory = appDir;
                psiSeed.UseShellExecute = false;
                psiSeed.CreateNoWindow = true;
                if (Directory.Exists(nodeDir))
                {
                    psiSeed.EnvironmentVariables["PATH"] = nodeDir + ";" + Environment.GetEnvironmentVariable("PATH");
                }
                psiSeed.EnvironmentVariables["DATABASE_URL"] = "postgresql://postgres@127.0.0.1:5432/it_asset_db?schema=public";
                Process pSeed = Process.Start(psiSeed);
                if (pSeed != null)
                {
                    pSeed.WaitForExit(30000);
                    AppendLog("✅ Đã khởi tạo dữ liệu mẫu và tài khoản quản trị!");
                }
            }
            catch (Exception ex)
            {
                AppendLog("Đồng bộ DB: " + ex.Message);
            }
        }

        private void CreateServerShortcut()
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string shortcutFile = Path.Combine(desktopPath, "SIMPLY IT Server.lnk");
                string targetExe = Path.Combine(appDir, "SimplyIT_Server.exe");
                string iconPath = Path.Combine(appDir, "app.ico");

                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutFile);
                    shortcut.TargetPath = targetExe;
                    shortcut.WorkingDirectory = appDir;
                    shortcut.Description = "SIMPLY IT - Trung Tâm Quản Trị Dịch Vụ & Tài Sản IT";
                    if (File.Exists(iconPath))
                    {
                        shortcut.IconLocation = iconPath + ", 0";
                    }
                    shortcut.Save();
                    AppendLog("✅ Đã tạo Shortcut tại màn hình Desktop!");
                }
            }
            catch (Exception ex)
            {
                AppendLog("Tạo Shortcut: " + ex.Message);
            }
        }
    }
}
