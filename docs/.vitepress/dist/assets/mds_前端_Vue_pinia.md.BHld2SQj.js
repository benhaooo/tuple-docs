import{_ as i,c as s,o as a,a4 as t}from"./chunks/framework.4aTu-Nia.js";const E=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"mds/前端/Vue/pinia.md","filePath":"mds/前端/Vue/pinia.md"}'),e={name:"mds/前端/Vue/pinia.md"},n=t(`<h2 id="状态持久化" tabindex="-1">状态持久化 <a class="header-anchor" href="#状态持久化" aria-label="Permalink to &quot;状态持久化&quot;">​</a></h2><p><code>npm i pinia-plugin-persistedstate</code></p><div class="language-javascript vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">javascript</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> { createPinia } </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;pinia&#39;</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">import</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> piniaPluginPersistedstate </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">from</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;"> &#39;pinia-plugin-persistedstate&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">const</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> pinia</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> createPinia</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">()</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">pinia.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">use</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(piniaPluginPersistedstate)</span></span></code></pre></div><p><img src="https://cdn.nlark.com/yuque/0/2024/png/22602718/1711701253110-80b49492-b826-4019-95a9-ae67a667fb12.png#averageHue=%23bfab6c&amp;clientId=u2377ecf7-c765-4&amp;from=paste&amp;height=157&amp;id=uca0168c2&amp;originHeight=314&amp;originWidth=698&amp;originalType=binary&amp;ratio=2&amp;rotation=0&amp;showTitle=false&amp;size=24081&amp;status=done&amp;style=none&amp;taskId=uac2c01be-73b9-4a83-9678-2f1b0ca63eb&amp;title=&amp;width=349" alt="image.png"></p><h2 id="用户登录" tabindex="-1">用户登录 <a class="header-anchor" href="#用户登录" aria-label="Permalink to &quot;用户登录&quot;">​</a></h2><h4 id="区分登录和非登录状态" tabindex="-1">区分登录和非登录状态 <a class="header-anchor" href="#区分登录和非登录状态" aria-label="Permalink to &quot;区分登录和非登录状态&quot;">​</a></h4><div class="language-vue vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">vue</span><pre class="shiki shiki-themes github-light github-dark vp-code"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&lt;</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">div</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> v-if</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">=</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">userStore.userInfo.token</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;&lt;/</span><span style="--shiki-light:#22863A;--shiki-dark:#85E89D;">div</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">&gt;</span></span></code></pre></div>`,7),p=[n];function h(l,k,r,d,o,c){return a(),s("div",null,p)}const m=i(e,[["render",h]]);export{E as __pageData,m as default};
