import { getDictionary } from "@/src/i18n/server";
import { userRepository } from "@repo/database";
import AboutClient from "./AboutClient";

// Import creator photos for fallback
import marioPhoto from "@/assets/mario.jpeg";
import lucasPhoto from "@/assets/lucas.jpg";
import francaPhoto from "@/assets/franca.jpg";

export default async function AboutPage() {
  const dict = await getDictionary();

  // Fetch creators data in parallel
  const usernames = ["mariojr", "lucas", "joaofranca"];
  const users = await Promise.all(
    usernames.map((username) => userRepository.findByUsername(username))
  );

  const creators = [
    {
      username: "mariojr",
      name: users[0]?.name || "Mario Jr",
      role: dict.about.creators.mario.role,
      bio: users[0]?.bio || dict.about.creators.mario.bio,
      avatarUrl: users[0]?.image || marioPhoto.src,
      links: {
        github: users[0]?.githubUrl || "https://github.com/marioccomp",
        linkedin: users[0]?.linkedinUrl || "https://www.linkedin.com/in/mariocjunior1/",
        website: users[0]?.websiteUrl || "https://mariojr.com.br/",
      },
    },
    {
      username: "lucas",
      name: users[1]?.name || "Lucas",
      role: dict.about.creators.lucas.role,
      bio: users[1]?.bio || dict.about.creators.lucas.bio,
      avatarUrl: users[1]?.image || lucasPhoto.src,
      links: {
        github: users[1]?.githubUrl || "https://github.com/LucasSSantiago",
        linkedin: users[1]?.linkedinUrl || "https://www.linkedin.com/in/lucassilvasantiago/",
      },
    },
    {
      username: "joaofranca",
      name: users[2]?.name || "João França",
      role: dict.about.creators.joao.role,
      bio: users[2]?.bio || dict.about.creators.joao.bio,
      avatarUrl: users[2]?.image || francaPhoto.src,
      links: {
        github: users[2]?.githubUrl || "https://github.com/M4C4BU",
        linkedin: users[2]?.linkedinUrl || "https://www.linkedin.com/in/jo%C3%A3ofran%C3%A7a/",
      },
    },
  ];

  return <AboutClient creators={creators} dict={dict} />;
}
