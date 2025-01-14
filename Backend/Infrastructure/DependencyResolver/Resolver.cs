using Application;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.DependencyResolver;

public class Resolver
{

    public static void RegisterInfrastructureLayer(IServiceCollection serviceCollection)
    {
        serviceCollection.AddScoped<ITestRepository, TestRepository>();
    }
}
