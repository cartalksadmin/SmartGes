import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Building2, Shield, Users } from 'lucide-react';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur RealTech Holding",
      });

      // Redirect back to the page that required auth (if any)
      const state: any = (location && (location.state as any)) || {};
      const from = state.from?.pathname || '/admin/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      // Prefer a server-provided message (error.response.data.error) when available
      const serverMsg = error?.response?.data?.error || error?.message;
      toast({
        title: "Erreur de connexion",
        description: serverMsg || "Email ou mot de passe incorrect",
        variant: "destructive",
      });
      // focus email for retry
      const el = document.getElementById('email') as HTMLInputElement | null;
      if (el) el.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1A2F] flex items-center justify-center p-4">

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="text-center lg:text-left text-white space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
              <div className="bg-white/20 p-3 rounded-xl">
                <Building2 className="h-8 w-8" />
              </div>
              <h1 className="text-4xl font-bold">RealTech Holding</h1>
            </div>
            
            <h2 className="text-2xl font-semibold opacity-90">
              Plateforme de Gestion Intelligente
            </h2>
            <p className="text-lg opacity-80 max-w-md">
              Gérez votre boutique informatique avec efficacité. 
              Commandes, produits, services et équipes, tout en un seul endroit.
            </p>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
            <div className="glass-effect p-4 rounded-lg text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold">Sécurisé</h3>
              <p className="text-sm opacity-70">Protection avancée</p>
            </div>
            <div className="glass-effect p-4 rounded-lg text-center">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold">Multi-utilisateur</h3>
              <p className="text-sm opacity-70">Gestion des rôles</p>
            </div>
            <div className="glass-effect p-4 rounded-lg text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-80" />
              <h3 className="font-semibold">Évolutif</h3>
              <p className="text-sm opacity-70">Croissance adaptée</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex justify-center animate-slide-up">
          <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold text-primary">Connexion</CardTitle>
              <CardDescription className="text-muted-foreground">
                Accédez à votre espace de gestion
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email professionnel</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@realtech-holding.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
              </form>

              <div className="text-center pt-4">
                <a href="#" className="text-sm text-primary hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;